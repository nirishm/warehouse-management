import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { listAuditEntries } from '@/modules/audit-trail/queries/audit-log';

// ── Types ──────────────────────────────────────────────────────────

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
  commodityId?: string;
  allowedLocationIds?: string[] | null;
}

export interface DashboardKpis {
  totalStockItems: number;
  movementsInRange: number;
  activeAlerts: number;
  activeLocations: number;
}

export interface RecentTransaction {
  id: string;
  type: 'dispatch' | 'purchase' | 'sale';
  number: string;
  status: string;
  date: string;
  commodityName: string;
  quantity: number;
  unit: string;
  locationName: string;
}

export interface StockByLocationRow {
  locationId: string;
  locationName: string;
  locationCode: string;
  totalStock: number;
  commodityCount: number;
  hasShortage: boolean;
}

export interface ShortageAlert {
  thresholdId: string;
  commodityName: string;
  commodityCode: string;
  locationName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  unitAbbreviation: string;
  severity: 'CRITICAL' | 'WARNING';
}

export interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

// ── Helpers ────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SCHEMA_RE = /^tenant_[a-z0-9_]+$/;

function validateUuid(v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (!UUID_RE.test(v)) throw new Error(`Invalid UUID: ${v}`);
  return v;
}

function validateDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (!ISO_DATE_RE.test(v)) throw new Error(`Invalid date: ${v}`);
  return v;
}

function validateSchema(schema: string): string {
  if (!SCHEMA_RE.test(schema)) throw new Error(`Invalid schema name: ${schema}`);
  return schema;
}

function buildLocationFilter(
  filters: DashboardFilters
): { locationIds: string[] | null } {
  if (filters.locationId) return { locationIds: [validateUuid(filters.locationId)!] };
  if (filters.allowedLocationIds && filters.allowedLocationIds.length > 0) {
    return { locationIds: filters.allowedLocationIds };
  }
  return { locationIds: null };
}

function escapeLiteral(s: string): string {
  return s.replace(/'/g, "''");
}

// ── KPIs ───────────────────────────────────────────────────────────

export async function getDashboardKpis(
  schemaName: string,
  filters: DashboardFilters
): Promise<DashboardKpis> {
  validateSchema(schemaName);
  validateDate(filters.dateFrom);
  validateDate(filters.dateTo);
  validateUuid(filters.commodityId);

  const client = createTenantClient(schemaName);
  const adminClient = createAdminClient();
  const { locationIds } = buildLocationFilter(filters);

  // Total stock items (sum of current_stock)
  let stockQuery = client.from('stock_levels').select('current_stock');
  if (locationIds) stockQuery = stockQuery.in('location_id', locationIds);
  if (filters.commodityId) stockQuery = stockQuery.eq('commodity_id', filters.commodityId);
  const { data: stockRows } = await stockQuery;

  const totalStockItems = (stockRows ?? []).reduce(
    (sum, row) => sum + Number(row.current_stock ?? 0),
    0
  );

  // Movements in range (count dispatches + purchases + sales)
  const dateFrom = filters.dateFrom ?? '1970-01-01';
  const dateTo = filters.dateTo ? `${filters.dateTo}T23:59:59` : '2099-12-31';

  const locFilter = locationIds
    ? `AND location_id IN (${locationIds.map((id) => `'${escapeLiteral(id)}'`).join(',')})`
    : '';
  const locFilterOrigin = locationIds
    ? `AND origin_location_id IN (${locationIds.map((id) => `'${escapeLiteral(id)}'`).join(',')})`
    : '';

  const movementsQuery = `
    SELECT (
      (SELECT COUNT(*)::int FROM "${schemaName}".dispatches
       WHERE deleted_at IS NULL AND created_at >= '${escapeLiteral(dateFrom)}' AND created_at <= '${escapeLiteral(dateTo)}' ${locFilterOrigin})
      +
      (SELECT COUNT(*)::int FROM "${schemaName}".purchases
       WHERE deleted_at IS NULL AND created_at >= '${escapeLiteral(dateFrom)}' AND created_at <= '${escapeLiteral(dateTo)}' ${locFilter})
      +
      (SELECT COUNT(*)::int FROM "${schemaName}".sales
       WHERE deleted_at IS NULL AND created_at >= '${escapeLiteral(dateFrom)}' AND created_at <= '${escapeLiteral(dateTo)}' ${locFilter})
    ) AS total
  `;

  const { data: movResult } = await adminClient.rpc('exec_sql', { query: movementsQuery });
  const movementsInRange = Number((movResult as unknown[])?.[0] && (movResult as unknown as Array<{ total: number }>)[0]?.total) || 0;

  // Active alerts (CRITICAL + WARNING count)
  const alertQuery = `
    SELECT COUNT(*)::int AS cnt
    FROM "${schemaName}".stock_alert_thresholds t
    JOIN "${schemaName}".commodities c ON c.id = t.commodity_id AND c.deleted_at IS NULL
    JOIN "${schemaName}".locations l ON l.id = t.location_id AND l.deleted_at IS NULL
    LEFT JOIN "${schemaName}".stock_levels sl
      ON sl.commodity_id = t.commodity_id AND sl.location_id = t.location_id AND sl.unit_id = t.unit_id
    WHERE t.is_active = true
      AND COALESCE(sl.current_stock, 0) <= t.reorder_point
      ${locationIds ? `AND t.location_id IN (${locationIds.map((id) => `'${escapeLiteral(id)}'`).join(',')})` : ''}
  `;

  const { data: alertResult } = await adminClient.rpc('exec_sql', { query: alertQuery });
  const activeAlerts = Number((alertResult as unknown as Array<{ cnt: number }>)?.[0]?.cnt) || 0;

  // Active locations (distinct locations with stock > 0)
  let locCountQuery = client.from('stock_levels').select('location_id');
  if (locationIds) locCountQuery = locCountQuery.in('location_id', locationIds);
  locCountQuery = locCountQuery.gt('current_stock', 0);
  const { data: locRows } = await locCountQuery;
  const activeLocations = new Set((locRows ?? []).map((r) => r.location_id)).size;

  return { totalStockItems, movementsInRange, activeAlerts, activeLocations };
}

// ── Recent Transactions ────────────────────────────────────────────

export async function getRecentTransactions(
  schemaName: string,
  filters: DashboardFilters,
  limit = 8
): Promise<RecentTransaction[]> {
  validateSchema(schemaName);
  validateDate(filters.dateFrom);
  validateDate(filters.dateTo);
  validateUuid(filters.commodityId);
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 50));

  const adminClient = createAdminClient();
  const { locationIds } = buildLocationFilter(filters);

  const dateFrom = filters.dateFrom ?? '1970-01-01';
  const dateTo = filters.dateTo ? `${filters.dateTo}T23:59:59` : '2099-12-31';

  const locFilterOrigin = locationIds
    ? `AND d.origin_location_id IN (${locationIds.map((id) => `'${escapeLiteral(id)}'`).join(',')})`
    : '';
  const locFilter = locationIds
    ? `AND t.location_id IN (${locationIds.map((id) => `'${escapeLiteral(id)}'`).join(',')})`
    : '';
  const commodityFilter = filters.commodityId
    ? `AND i.commodity_id = '${escapeLiteral(filters.commodityId)}'`
    : '';
  const commodityFilterDirect = filters.commodityId
    ? `AND i.commodity_id = '${escapeLiteral(filters.commodityId)}'`
    : '';

  const query = `
    (
      SELECT
        d.id,
        'dispatch' AS type,
        d.dispatch_number AS number,
        d.status,
        COALESCE(d.dispatched_at, d.created_at) AS date,
        c.name AS commodity_name,
        i.sent_quantity AS quantity,
        u.abbreviation AS unit,
        l.name AS location_name
      FROM "${schemaName}".dispatches d
      JOIN "${schemaName}".dispatch_items i ON i.dispatch_id = d.id
      JOIN "${schemaName}".commodities c ON c.id = i.commodity_id
      JOIN "${schemaName}".units u ON u.id = i.unit_id
      JOIN "${schemaName}".locations l ON l.id = d.origin_location_id
      WHERE d.deleted_at IS NULL
        AND d.created_at >= '${escapeLiteral(dateFrom)}' AND d.created_at <= '${escapeLiteral(dateTo)}'
        ${locFilterOrigin.replace('d.origin_location_id', 'd.origin_location_id')}
        ${commodityFilterDirect}
    )
    UNION ALL
    (
      SELECT
        t.id,
        'purchase' AS type,
        t.purchase_number AS number,
        t.status,
        COALESCE(t.received_at, t.created_at) AS date,
        c.name AS commodity_name,
        i.quantity,
        u.abbreviation AS unit,
        l.name AS location_name
      FROM "${schemaName}".purchases t
      JOIN "${schemaName}".purchase_items i ON i.purchase_id = t.id
      JOIN "${schemaName}".commodities c ON c.id = i.commodity_id
      JOIN "${schemaName}".units u ON u.id = i.unit_id
      JOIN "${schemaName}".locations l ON l.id = t.location_id
      WHERE t.deleted_at IS NULL
        AND t.created_at >= '${escapeLiteral(dateFrom)}' AND t.created_at <= '${escapeLiteral(dateTo)}'
        ${locFilter}
        ${commodityFilter}
    )
    UNION ALL
    (
      SELECT
        t.id,
        'sale' AS type,
        t.sale_number AS number,
        t.status,
        COALESCE(t.sold_at, t.created_at) AS date,
        c.name AS commodity_name,
        i.quantity,
        u.abbreviation AS unit,
        l.name AS location_name
      FROM "${schemaName}".sales t
      JOIN "${schemaName}".sale_items i ON i.sale_id = t.id
      JOIN "${schemaName}".commodities c ON c.id = i.commodity_id
      JOIN "${schemaName}".units u ON u.id = i.unit_id
      JOIN "${schemaName}".locations l ON l.id = t.location_id
      WHERE t.deleted_at IS NULL
        AND t.created_at >= '${escapeLiteral(dateFrom)}' AND t.created_at <= '${escapeLiteral(dateTo)}'
        ${locFilter.replace('t.location_id', 't.location_id')}
        ${commodityFilter}
    )
    ORDER BY date DESC
    LIMIT ${safeLimit}
  `;

  const { data, error } = await adminClient.rpc('exec_sql', { query });
  if (error) throw new Error(`Failed to get recent transactions: ${error.message}`);

  return ((data as unknown[]) ?? []).map((row: unknown) => {
    const r = row as {
      id: string;
      type: string;
      number: string;
      status: string;
      date: string;
      commodity_name: string;
      quantity: number;
      unit: string;
      location_name: string;
    };
    return {
      id: r.id,
      type: r.type as RecentTransaction['type'],
      number: r.number,
      status: r.status,
      date: r.date,
      commodityName: r.commodity_name,
      quantity: Number(r.quantity),
      unit: r.unit,
      locationName: r.location_name,
    };
  });
}

// ── Stock by Location ──────────────────────────────────────────────

export async function getStockByLocation(
  schemaName: string,
  filters: DashboardFilters
): Promise<StockByLocationRow[]> {
  validateSchema(schemaName);
  validateUuid(filters.commodityId);

  const adminClient = createAdminClient();
  const { locationIds } = buildLocationFilter(filters);

  const locWhere = locationIds
    ? `AND sl.location_id IN (${locationIds.map((id) => `'${escapeLiteral(id)}'`).join(',')})`
    : '';
  const commodityWhere = filters.commodityId
    ? `AND sl.commodity_id = '${escapeLiteral(filters.commodityId)}'`
    : '';

  const query = `
    SELECT
      l.id AS location_id,
      l.name AS location_name,
      l.code AS location_code,
      COALESCE(SUM(sl.current_stock), 0) AS total_stock,
      COUNT(DISTINCT sl.commodity_id)::int AS commodity_count,
      CASE WHEN COUNT(t.id) > 0 THEN true ELSE false END AS has_shortage
    FROM "${schemaName}".locations l
    LEFT JOIN "${schemaName}".stock_levels sl ON sl.location_id = l.id ${commodityWhere}
    LEFT JOIN "${schemaName}".stock_alert_thresholds t
      ON t.location_id = l.id AND t.is_active = true
      AND EXISTS (
        SELECT 1 FROM "${schemaName}".stock_levels sl2
        WHERE sl2.commodity_id = t.commodity_id
          AND sl2.location_id = t.location_id
          AND sl2.unit_id = t.unit_id
          AND sl2.current_stock <= t.reorder_point
      )
    WHERE l.deleted_at IS NULL AND l.is_active = true
      ${locWhere}
    GROUP BY l.id, l.name, l.code
    ORDER BY total_stock DESC
  `;

  const { data, error } = await adminClient.rpc('exec_sql', { query });
  if (error) throw new Error(`Failed to get stock by location: ${error.message}`);

  return ((data as unknown[]) ?? []).map((row: unknown) => {
    const r = row as {
      location_id: string;
      location_name: string;
      location_code: string;
      total_stock: number;
      commodity_count: number;
      has_shortage: boolean;
    };
    return {
      locationId: r.location_id,
      locationName: r.location_name,
      locationCode: r.location_code,
      totalStock: Number(r.total_stock),
      commodityCount: r.commodity_count,
      hasShortage: r.has_shortage,
    };
  });
}

// ── Shortage Alerts ────────────────────────────────────────────────

export async function getShortageAlerts(
  schemaName: string,
  filters: DashboardFilters,
  limit = 5
): Promise<ShortageAlert[]> {
  validateSchema(schemaName);
  const safeAlertLimit = Math.max(1, Math.min(Math.floor(limit), 50));

  const adminClient = createAdminClient();
  const { locationIds } = buildLocationFilter(filters);

  const locWhere = locationIds
    ? `AND t.location_id IN (${locationIds.map((id) => `'${escapeLiteral(id)}'`).join(',')})`
    : '';

  const query = `
    SELECT
      t.id AS threshold_id,
      c.name AS commodity_name,
      c.code AS commodity_code,
      l.name AS location_name,
      COALESCE(sl.current_stock, 0) AS current_stock,
      t.min_stock,
      t.reorder_point,
      u.abbreviation AS unit_abbreviation,
      CASE
        WHEN COALESCE(sl.current_stock, 0) <= t.min_stock THEN 'CRITICAL'
        ELSE 'WARNING'
      END AS severity
    FROM "${schemaName}".stock_alert_thresholds t
    JOIN "${schemaName}".commodities c ON c.id = t.commodity_id AND c.deleted_at IS NULL
    JOIN "${schemaName}".locations l ON l.id = t.location_id AND l.deleted_at IS NULL
    JOIN "${schemaName}".units u ON u.id = t.unit_id
    LEFT JOIN "${schemaName}".stock_levels sl
      ON sl.commodity_id = t.commodity_id AND sl.location_id = t.location_id AND sl.unit_id = t.unit_id
    WHERE t.is_active = true
      AND COALESCE(sl.current_stock, 0) <= t.reorder_point
      ${locWhere}
    ORDER BY
      CASE WHEN COALESCE(sl.current_stock, 0) <= t.min_stock THEN 0 ELSE 1 END,
      COALESCE(sl.current_stock, 0) ASC
    LIMIT ${safeAlertLimit}
  `;

  const { data, error } = await adminClient.rpc('exec_sql', { query });
  if (error) throw new Error(`Failed to get shortage alerts: ${error.message}`);

  return ((data as unknown[]) ?? []).map((row: unknown) => {
    const r = row as {
      threshold_id: string;
      commodity_name: string;
      commodity_code: string;
      location_name: string;
      current_stock: number;
      min_stock: number;
      reorder_point: number;
      unit_abbreviation: string;
      severity: string;
    };
    return {
      thresholdId: r.threshold_id,
      commodityName: r.commodity_name,
      commodityCode: r.commodity_code,
      locationName: r.location_name,
      currentStock: Number(r.current_stock),
      minStock: Number(r.min_stock),
      reorderPoint: Number(r.reorder_point),
      unitAbbreviation: r.unit_abbreviation,
      severity: r.severity as 'CRITICAL' | 'WARNING',
    };
  });
}

// ── Recent Activity ────────────────────────────────────────────────

export async function getRecentActivity(
  schemaName: string,
  filters: DashboardFilters,
  limit = 7
): Promise<ActivityEntry[]> {
  const { data } = await listAuditEntries(schemaName, {
    from: filters.dateFrom,
    to: filters.dateTo ? `${filters.dateTo}T23:59:59` : undefined,
    limit,
  });

  return data.map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    userName: entry.user_name,
    createdAt: entry.created_at,
    metadata: entry.metadata,
  }));
}
