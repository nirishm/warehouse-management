import { createTenantClient } from '@/core/db/tenant-query';

// ── Types ──────────────────────────────────────────────────────────

export interface AnalyticsLocationFilter {
  allowedLocationIds?: string[] | null;
}

export interface OverviewStats {
  totalDispatches: number;
  totalPurchases: number;
  totalSales: number;
  totalStockItems: number;
  activeLocations: number;
  activeCommodities: number;
}

export interface DispatchStatusCount {
  status: string;
  count: number;
}

export interface TopRoute {
  originName: string;
  destName: string;
  dispatchCount: number;
  avgShortagePercent: number;
}

export interface DispatchAnalytics {
  statusBreakdown: DispatchStatusCount[];
  totalSentQuantity: number;
  totalReceivedQuantity: number;
  overallShortagePercent: number;
  topRoutes: TopRoute[];
}

export interface MovementEntry {
  id: string;
  type: 'dispatch' | 'purchase' | 'sale';
  number: string;
  date: string;
  status: string;
  description: string;
}

// ── Overview Stats ─────────────────────────────────────────────────

export async function getOverviewStats(
  schemaName: string,
  filters?: AnalyticsLocationFilter
): Promise<OverviewStats> {
  const client = createTenantClient(schemaName);
  const locIds = filters?.allowedLocationIds;
  const hasLocFilter = locIds !== null && locIds !== undefined && locIds.length > 0;

  let dispatchQuery = client
    .from('dispatches')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (hasLocFilter) dispatchQuery = dispatchQuery.in('origin_location_id', locIds!);

  let purchaseQuery = client
    .from('purchases')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (hasLocFilter) purchaseQuery = purchaseQuery.in('location_id', locIds!);

  let salesQuery = client
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  if (hasLocFilter) salesQuery = salesQuery.in('location_id', locIds!);

  let stockQuery = client.from('stock_levels').select('current_stock');
  if (hasLocFilter) stockQuery = stockQuery.in('location_id', locIds!);

  let locationsQuery = client
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('is_active', true);
  if (hasLocFilter) locationsQuery = locationsQuery.in('id', locIds!);

  const [dispatches, purchases, sales, stockLevels, locations, commodities] =
    await Promise.all([
      dispatchQuery,
      purchaseQuery,
      salesQuery,
      stockQuery,
      locationsQuery,
      client
        .from('commodities')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true),
    ]);

  const totalStockItems = (stockLevels.data ?? []).reduce(
    (sum, row) => sum + Number(row.current_stock ?? 0),
    0
  );

  return {
    totalDispatches: dispatches.count ?? 0,
    totalPurchases: purchases.count ?? 0,
    totalSales: sales.count ?? 0,
    totalStockItems,
    activeLocations: locations.count ?? 0,
    activeCommodities: commodities.count ?? 0,
  };
}

// ── Dispatch Analytics ─────────────────────────────────────────────

export async function getDispatchAnalytics(
  schemaName: string,
  filters?: AnalyticsLocationFilter
): Promise<DispatchAnalytics> {
  const client = createTenantClient(schemaName);
  const locIds = filters?.allowedLocationIds;
  const hasLocFilter = locIds !== null && locIds !== undefined && locIds.length > 0;

  // Default to 90-day window to avoid unbounded full-table scans
  const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch dispatches with nested items and location names in a single query
  // (bounded to 90 days + 500 row guard)
  let dispatchQuery = client
    .from('dispatches')
    .select(
      'id, status, origin_location_id, dest_location_id, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name), dispatch_items(dispatch_id, sent_quantity, received_quantity)'
    )
    .is('deleted_at', null)
    .gte('created_at', defaultFrom)
    .limit(500);
  if (hasLocFilter) dispatchQuery = dispatchQuery.in('origin_location_id', locIds!);

  const { data: dispatchRows, error: dispatchError } = await dispatchQuery;

  if (dispatchError)
    throw new Error(`Failed to fetch dispatches: ${dispatchError.message}`);

  const allDispatches = (dispatchRows ?? []) as unknown as Array<{
    id: string;
    status: string;
    origin_location_id: string;
    dest_location_id: string;
    origin_location: { name: string } | null;
    dest_location: { name: string } | null;
    dispatch_items: Array<{
      dispatch_id: string;
      sent_quantity: number | null;
      received_quantity: number | null;
    }>;
  }>;

  // Status breakdown
  const statusMap = new Map<string, number>();
  for (const d of allDispatches) {
    statusMap.set(d.status, (statusMap.get(d.status) ?? 0) + 1);
  }
  const statusBreakdown: DispatchStatusCount[] = Array.from(
    statusMap.entries()
  ).map(([status, count]) => ({ status, count }));

  // Extract items from nested result — no second round-trip needed
  const allItems = allDispatches.flatMap((d) =>
    (d.dispatch_items ?? []) as Array<{
      dispatch_id: string;
      sent_quantity: number | null;
      received_quantity: number | null;
    }>
  );

  let totalSentQuantity = 0;
  let totalReceivedQuantity = 0;

  // Build per-dispatch item aggregation for route shortage calc
  const dispatchItemAgg = new Map<
    string,
    { sent: number; received: number }
  >();
  for (const item of allItems) {
    const sent = Number(item.sent_quantity ?? 0);
    const received = Number(item.received_quantity ?? 0);
    totalSentQuantity += sent;
    totalReceivedQuantity += received;

    const existing = dispatchItemAgg.get(item.dispatch_id) ?? {
      sent: 0,
      received: 0,
    };
    existing.sent += sent;
    existing.received += received;
    dispatchItemAgg.set(item.dispatch_id, existing);
  }

  const overallShortagePercent =
    totalSentQuantity > 0
      ? ((totalSentQuantity - totalReceivedQuantity) / totalSentQuantity) * 100
      : 0;

  // Top routes: group by origin→dest pair
  const routeMap = new Map<
    string,
    {
      originName: string;
      destName: string;
      count: number;
      totalSent: number;
      totalReceived: number;
    }
  >();

  for (const d of allDispatches) {
    const key = `${d.origin_location_id}|${d.dest_location_id}`;
    const existing = routeMap.get(key) ?? {
      originName: d.origin_location?.name ?? 'Unknown',
      destName: d.dest_location?.name ?? 'Unknown',
      count: 0,
      totalSent: 0,
      totalReceived: 0,
    };
    existing.count += 1;
    const agg = dispatchItemAgg.get(d.id);
    if (agg) {
      existing.totalSent += agg.sent;
      existing.totalReceived += agg.received;
    }
    routeMap.set(key, existing);
  }

  const topRoutes: TopRoute[] = Array.from(routeMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((r) => ({
      originName: r.originName,
      destName: r.destName,
      dispatchCount: r.count,
      avgShortagePercent:
        r.totalSent > 0
          ? ((r.totalSent - r.totalReceived) / r.totalSent) * 100
          : 0,
    }));

  return {
    statusBreakdown,
    totalSentQuantity,
    totalReceivedQuantity,
    overallShortagePercent,
    topRoutes,
  };
}

// ── Movement Summary ───────────────────────────────────────────────

export async function getMovementSummary(
  schemaName: string,
  filters?: AnalyticsLocationFilter
): Promise<MovementEntry[]> {
  const client = createTenantClient(schemaName);
  const locIds = filters?.allowedLocationIds;
  const hasLocFilter = locIds !== null && locIds !== undefined && locIds.length > 0;

  let dispatchQueryBuilder = client
    .from('dispatches')
    .select(
      'id, dispatch_number, status, dispatched_at, created_at, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);
  if (hasLocFilter) dispatchQueryBuilder = dispatchQueryBuilder.in('origin_location_id', locIds!);

  let purchaseQueryBuilder = client
    .from('purchases')
    .select(
      'id, purchase_number, status, received_at, created_at, location:locations!location_id(name)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);
  if (hasLocFilter) purchaseQueryBuilder = purchaseQueryBuilder.in('location_id', locIds!);

  let saleQueryBuilder = client
    .from('sales')
    .select(
      'id, sale_number, status, sold_at, created_at, location:locations!location_id(name)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);
  if (hasLocFilter) saleQueryBuilder = saleQueryBuilder.in('location_id', locIds!);

  const [dispatchRes, purchaseRes, saleRes] = await Promise.all([
    dispatchQueryBuilder,
    purchaseQueryBuilder,
    saleQueryBuilder,
  ]);

  const movements: MovementEntry[] = [];

  for (const d of (dispatchRes.data ?? []) as Array<Record<string, unknown>>) {
    const origin = d.origin_location as { name: string } | null;
    const dest = d.dest_location as { name: string } | null;
    movements.push({
      id: d.id as string,
      type: 'dispatch',
      number: d.dispatch_number as string,
      date: (d.dispatched_at as string) ?? (d.created_at as string),
      status: d.status as string,
      description: `${origin?.name ?? 'Unknown'} → ${dest?.name ?? 'Unknown'}`,
    });
  }

  for (const p of (purchaseRes.data ?? []) as Array<
    Record<string, unknown>
  >) {
    const loc = p.location as { name: string } | null;
    movements.push({
      id: p.id as string,
      type: 'purchase',
      number: p.purchase_number as string,
      date: (p.received_at as string) ?? (p.created_at as string),
      status: p.status as string,
      description: `Received at ${loc?.name ?? 'Unknown'}`,
    });
  }

  for (const s of (saleRes.data ?? []) as Array<Record<string, unknown>>) {
    const loc = s.location as { name: string } | null;
    movements.push({
      id: s.id as string,
      type: 'sale',
      number: s.sale_number as string,
      date: (s.sold_at as string) ?? (s.created_at as string),
      status: s.status as string,
      description: `Sold from ${loc?.name ?? 'Unknown'}`,
    });
  }

  // Sort by date descending, take top 10
  movements.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return movements.slice(0, 10);
}
