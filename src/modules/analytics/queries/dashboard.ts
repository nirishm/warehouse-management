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

  const dateFrom = filters.dateFrom ?? '1970-01-01';
  const dateTo = filters.dateTo ? `${filters.dateTo}T23:59:59` : '2099-12-31';

  // Stock totals and active locations use the tenant client (already safe)
  let stockQuery = client.from('stock_levels').select('current_stock');
  if (locationIds) stockQuery = stockQuery.in('location_id', locationIds);
  if (filters.commodityId) stockQuery = stockQuery.eq('commodity_id', filters.commodityId);

  let locCountQuery = client.from('stock_levels').select('location_id');
  if (locationIds) locCountQuery = locCountQuery.in('location_id', locationIds);
  locCountQuery = locCountQuery.gt('current_stock', 0);

  // Movements count + alert count via dedicated safe PG functions
  const [
    { data: stockRows },
    { data: kpiResult, error: kpiError },
    { data: locRows },
  ] = await Promise.all([
    stockQuery,
    adminClient.rpc('dashboard_kpis', {
      p_schema: schemaName,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_location_ids: locationIds,
    }),
    locCountQuery,
  ]);

  if (kpiError) throw new Error(`Failed to get dashboard KPIs: ${kpiError.message}`);

  const kpi = kpiResult as unknown as { movements_in_range: number; active_alerts: number } | null;

  const totalStockItems = (stockRows ?? []).reduce(
    (sum, row) => sum + Number(row.current_stock ?? 0),
    0
  );
  const movementsInRange = Number(kpi?.movements_in_range ?? 0);
  const activeAlerts = Number(kpi?.active_alerts ?? 0);
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

  const { data, error } = await adminClient.rpc('dashboard_recent_transactions', {
    p_schema: schemaName,
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_location_ids: locationIds,
    p_commodity_id: filters.commodityId ?? null,
    p_limit: safeLimit,
  });

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

  const { data, error } = await adminClient.rpc('dashboard_stock_by_location', {
    p_schema: schemaName,
    p_location_ids: locationIds,
    p_commodity_id: filters.commodityId ?? null,
  });

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

  const { data, error } = await adminClient.rpc('dashboard_shortage_alerts', {
    p_schema: schemaName,
    p_location_ids: locationIds,
    p_limit: safeAlertLimit,
  });

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
