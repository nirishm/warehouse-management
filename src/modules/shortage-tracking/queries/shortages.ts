import { createTenantClient } from '@/core/db/tenant-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShortageOverview {
  total_received_dispatches: number;
  items_with_shortage: number;
  avg_shortage_percent: number;
  max_shortage_percent: number;
  total_quantity_lost: number;
}

export interface ShortageByRoute {
  origin_location_id: string;
  dest_location_id: string;
  origin_name: string;
  dest_name: string;
  dispatch_count: number;
  total_sent: number;
  total_received: number;
  total_shortage: number;
  avg_shortage_percent: number;
}

export interface ShortageByTransporter {
  transporter_name: string;
  dispatch_count: number;
  avg_shortage_percent: number;
  total_shortage: number;
}

export interface ShortageByCommodity {
  commodity_id: string;
  commodity_name: string;
  dispatch_count: number;
  total_sent: number;
  total_shortage: number;
  avg_shortage_percent: number;
}

export interface RecentShortageItem {
  id: string;
  dispatch_id: string;
  dispatch_number: string;
  commodity_name: string;
  origin_name: string;
  dest_name: string;
  sent_quantity: number;
  received_quantity: number;
  shortage: number;
  shortage_percent: number;
  received_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Internal row types for joined queries
// ---------------------------------------------------------------------------

interface DispatchJoinBase {
  id: string;
  status: string;
  received_at: string | null;
  deleted_at: string | null;
}

interface DispatchJoinRoute extends DispatchJoinBase {
  origin_location_id: string;
  dest_location_id: string;
}

interface DispatchJoinTransporter extends DispatchJoinBase {
  transporter_name: string | null;
}

interface DispatchJoinFull extends DispatchJoinBase {
  dispatch_number: string;
  origin_location_id: string;
  dest_location_id: string;
}

interface OverviewItemRow {
  shortage: number | null;
  shortage_percent: number | null;
  received_quantity: number | null;
  dispatch: DispatchJoinBase | null;
}

interface RouteItemRow {
  dispatch_id: string;
  sent_quantity: number | null;
  received_quantity: number | null;
  shortage: number | null;
  shortage_percent: number | null;
  dispatch: DispatchJoinRoute | null;
}

interface TransporterItemRow {
  dispatch_id: string;
  shortage: number | null;
  shortage_percent: number | null;
  dispatch: DispatchJoinTransporter | null;
}

interface CommodityItemRow {
  dispatch_id: string;
  commodity_id: string;
  sent_quantity: number | null;
  shortage: number | null;
  shortage_percent: number | null;
  dispatch: DispatchJoinBase | null;
}

interface RecentItemRow {
  id: string;
  dispatch_id: string;
  commodity_id: string;
  sent_quantity: number | null;
  received_quantity: number | null;
  shortage: number | null;
  shortage_percent: number | null;
  dispatch: DispatchJoinFull | null;
}

interface LocationRow {
  id: string;
  name: string;
}

interface CommodityRow {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Aggregate overview stats across all received dispatches.
 * Single query: dispatch_items joined to dispatches, filtered in JS.
 */
export async function getShortageOverview(
  schemaName: string
): Promise<ShortageOverview> {
  const client = createTenantClient(schemaName);
  const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from('dispatch_items')
    .select(
      'shortage, shortage_percent, received_quantity, dispatch:dispatches!dispatch_id(id, status, received_at, deleted_at)'
    )
    .limit(500);

  if (error) throw new Error(`Failed to fetch shortage overview: ${error.message}`);

  const rows = (data ?? []) as unknown as OverviewItemRow[];

  // Filter: dispatch must be received, not deleted, within 90 days
  const allItems = rows.filter((i) => {
    const d = i.dispatch;
    if (!d) return false;
    if (d.status !== 'received') return false;
    if (d.deleted_at !== null) return false;
    if (!d.received_at || d.received_at < defaultFrom) return false;
    return true;
  });

  // Count distinct dispatch IDs
  const dispatchIds = new Set(allItems.map((i) => i.dispatch!.id));

  if (dispatchIds.size === 0) {
    return {
      total_received_dispatches: 0,
      items_with_shortage: 0,
      avg_shortage_percent: 0,
      max_shortage_percent: 0,
      total_quantity_lost: 0,
    };
  }

  // Only items where received_quantity is not null (actually received)
  const receivedItems = allItems.filter((i) => i.received_quantity !== null);
  const shortageItems = receivedItems.filter((i) => toNum(i.shortage) > 0);

  const totalLost = shortageItems.reduce((s, i) => s + toNum(i.shortage), 0);
  const percents = receivedItems
    .map((i) => toNum(i.shortage_percent))
    .filter((p) => p !== null);
  const avgPct =
    percents.length > 0
      ? percents.reduce((s, p) => s + p, 0) / percents.length
      : 0;
  const maxPct = percents.length > 0 ? Math.max(...percents) : 0;

  return {
    total_received_dispatches: dispatchIds.size,
    items_with_shortage: shortageItems.length,
    avg_shortage_percent: Math.round(avgPct * 100) / 100,
    max_shortage_percent: Math.round(maxPct * 100) / 100,
    total_quantity_lost: Math.round(totalLost * 100) / 100,
  };
}

/**
 * Shortage grouped by route (origin -> destination).
 * Single query: dispatch_items joined to dispatches; locations fetched in parallel.
 */
export async function getShortageByRoute(
  schemaName: string
): Promise<ShortageByRoute[]> {
  const client = createTenantClient(schemaName);
  const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error: iErr } = await client
    .from('dispatch_items')
    .select(
      'dispatch_id, sent_quantity, received_quantity, shortage, shortage_percent, dispatch:dispatches!dispatch_id(id, status, received_at, deleted_at, origin_location_id, dest_location_id)'
    )
    .limit(500);

  if (iErr) throw new Error(`Failed to fetch dispatch items: ${iErr.message}`);

  const rows = (data ?? []) as unknown as RouteItemRow[];

  // Filter to received, non-deleted, within 90 days
  const filteredItems = rows.filter((i) => {
    const d = i.dispatch;
    if (!d) return false;
    if (d.status !== 'received') return false;
    if (d.deleted_at !== null) return false;
    if (!d.received_at || d.received_at < defaultFrom) return false;
    return true;
  });

  if (filteredItems.length === 0) return [];

  // Collect unique location IDs, then fetch in a single parallel query
  const locationIds = new Set<string>();
  for (const i of filteredItems) {
    locationIds.add(i.dispatch!.origin_location_id);
    locationIds.add(i.dispatch!.dest_location_id);
  }

  const { data: locData, error: lErr } = await client
    .from('locations')
    .select('id, name')
    .in('id', Array.from(locationIds));

  if (lErr) throw new Error(`Failed to fetch locations: ${lErr.message}`);

  const locMap = new Map(
    ((locData ?? []) as unknown as LocationRow[]).map((l) => [l.id, l.name])
  );

  // Aggregate by route
  const routeAgg = new Map<
    string,
    {
      origin_location_id: string;
      dest_location_id: string;
      dispatchIds: Set<string>;
      total_sent: number;
      total_received: number;
      total_shortage: number;
      percents: number[];
    }
  >();

  for (const item of filteredItems) {
    const d = item.dispatch!;
    const key = `${d.origin_location_id}|${d.dest_location_id}`;

    if (!routeAgg.has(key)) {
      routeAgg.set(key, {
        origin_location_id: d.origin_location_id,
        dest_location_id: d.dest_location_id,
        dispatchIds: new Set(),
        total_sent: 0,
        total_received: 0,
        total_shortage: 0,
        percents: [],
      });
    }

    const agg = routeAgg.get(key)!;
    agg.dispatchIds.add(item.dispatch_id);
    agg.total_sent += toNum(item.sent_quantity);
    agg.total_received += toNum(item.received_quantity);
    agg.total_shortage += toNum(item.shortage);
    if (item.shortage_percent !== null) {
      agg.percents.push(toNum(item.shortage_percent));
    }
  }

  const result: ShortageByRoute[] = Array.from(routeAgg.values()).map(
    (agg) => ({
      origin_location_id: agg.origin_location_id,
      dest_location_id: agg.dest_location_id,
      origin_name: locMap.get(agg.origin_location_id) ?? 'Unknown',
      dest_name: locMap.get(agg.dest_location_id) ?? 'Unknown',
      dispatch_count: agg.dispatchIds.size,
      total_sent: Math.round(agg.total_sent * 100) / 100,
      total_received: Math.round(agg.total_received * 100) / 100,
      total_shortage: Math.round(agg.total_shortage * 100) / 100,
      avg_shortage_percent:
        agg.percents.length > 0
          ? Math.round(
              (agg.percents.reduce((s, p) => s + p, 0) / agg.percents.length) *
                100
            ) / 100
          : 0,
    })
  );

  result.sort((a, b) => b.total_shortage - a.total_shortage);
  return result;
}

/**
 * Shortage grouped by transporter name.
 * Single query: dispatch_items joined to dispatches for transporter_name.
 */
export async function getShortageByTransporter(
  schemaName: string
): Promise<ShortageByTransporter[]> {
  const client = createTenantClient(schemaName);
  const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from('dispatch_items')
    .select(
      'dispatch_id, shortage, shortage_percent, dispatch:dispatches!dispatch_id(id, status, received_at, deleted_at, transporter_name)'
    )
    .limit(500);

  if (error) throw new Error(`Failed to fetch dispatch items: ${error.message}`);

  const rows = (data ?? []) as unknown as TransporterItemRow[];

  // Filter to received, non-deleted, within 90 days
  const filteredItems = rows.filter((i) => {
    const d = i.dispatch;
    if (!d) return false;
    if (d.status !== 'received') return false;
    if (d.deleted_at !== null) return false;
    if (!d.received_at || d.received_at < defaultFrom) return false;
    return true;
  });

  if (filteredItems.length === 0) return [];

  const transporterAgg = new Map<
    string,
    {
      dispatchIds: Set<string>;
      total_shortage: number;
      percents: number[];
    }
  >();

  for (const item of filteredItems) {
    const name = item.dispatch!.transporter_name ?? 'Unknown';

    if (!transporterAgg.has(name)) {
      transporterAgg.set(name, {
        dispatchIds: new Set(),
        total_shortage: 0,
        percents: [],
      });
    }

    const agg = transporterAgg.get(name)!;
    agg.dispatchIds.add(item.dispatch_id);
    agg.total_shortage += toNum(item.shortage);
    if (item.shortage_percent !== null) {
      agg.percents.push(toNum(item.shortage_percent));
    }
  }

  const result: ShortageByTransporter[] = Array.from(
    transporterAgg.entries()
  ).map(([name, agg]) => ({
    transporter_name: name,
    dispatch_count: agg.dispatchIds.size,
    total_shortage: Math.round(agg.total_shortage * 100) / 100,
    avg_shortage_percent:
      agg.percents.length > 0
        ? Math.round(
            (agg.percents.reduce((s, p) => s + p, 0) / agg.percents.length) *
              100
          ) / 100
        : 0,
  }));

  result.sort((a, b) => b.total_shortage - a.total_shortage);
  return result;
}

/**
 * Shortage grouped by commodity.
 * Single query: dispatch_items joined to dispatches; commodities fetched in parallel.
 */
export async function getShortageByCommodity(
  schemaName: string
): Promise<ShortageByCommodity[]> {
  const client = createTenantClient(schemaName);
  const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error: iErr } = await client
    .from('dispatch_items')
    .select(
      'dispatch_id, commodity_id, sent_quantity, shortage, shortage_percent, dispatch:dispatches!dispatch_id(id, status, received_at, deleted_at)'
    )
    .limit(500);

  if (iErr) throw new Error(`Failed to fetch dispatch items: ${iErr.message}`);

  const rows = (data ?? []) as unknown as CommodityItemRow[];

  // Filter to received, non-deleted, within 90 days
  const filteredItems = rows.filter((i) => {
    const d = i.dispatch;
    if (!d) return false;
    if (d.status !== 'received') return false;
    if (d.deleted_at !== null) return false;
    if (!d.received_at || d.received_at < defaultFrom) return false;
    return true;
  });

  if (filteredItems.length === 0) return [];

  // Collect unique commodity IDs and fetch names in a single extra query
  const commodityIds = new Set(filteredItems.map((i) => i.commodity_id));

  const { data: comData, error: cErr } = await client
    .from('commodities')
    .select('id, name')
    .in('id', Array.from(commodityIds));

  if (cErr) throw new Error(`Failed to fetch items: ${cErr.message}`);

  const comMap = new Map(
    ((comData ?? []) as unknown as CommodityRow[]).map((c) => [c.id, c.name])
  );

  const commAgg = new Map<
    string,
    {
      dispatchIds: Set<string>;
      total_sent: number;
      total_shortage: number;
      percents: number[];
    }
  >();

  for (const item of filteredItems) {
    const cid = item.commodity_id;

    if (!commAgg.has(cid)) {
      commAgg.set(cid, {
        dispatchIds: new Set(),
        total_sent: 0,
        total_shortage: 0,
        percents: [],
      });
    }

    const agg = commAgg.get(cid)!;
    agg.dispatchIds.add(item.dispatch_id);
    agg.total_sent += toNum(item.sent_quantity);
    agg.total_shortage += toNum(item.shortage);
    if (item.shortage_percent !== null) {
      agg.percents.push(toNum(item.shortage_percent));
    }
  }

  const result: ShortageByCommodity[] = Array.from(commAgg.entries()).map(
    ([cid, agg]) => ({
      commodity_id: cid,
      commodity_name: comMap.get(cid) ?? 'Unknown',
      dispatch_count: agg.dispatchIds.size,
      total_sent: Math.round(agg.total_sent * 100) / 100,
      total_shortage: Math.round(agg.total_shortage * 100) / 100,
      avg_shortage_percent:
        agg.percents.length > 0
          ? Math.round(
              (agg.percents.reduce((s, p) => s + p, 0) / agg.percents.length) *
                100
            ) / 100
          : 0,
    })
  );

  result.sort((a, b) => b.total_shortage - a.total_shortage);
  return result;
}

/**
 * Recent dispatch items with shortage > 0.
 * Single query: dispatch_items joined to dispatches; commodities + locations fetched in parallel.
 */
export async function getRecentShortages(
  schemaName: string,
  limit: number = 20
): Promise<RecentShortageItem[]> {
  const client = createTenantClient(schemaName);
  const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error: iErr } = await client
    .from('dispatch_items')
    .select(
      'id, dispatch_id, commodity_id, sent_quantity, received_quantity, shortage, shortage_percent, dispatch:dispatches!dispatch_id(id, status, dispatch_number, origin_location_id, dest_location_id, received_at, deleted_at)'
    )
    .gt('shortage', 0)
    .limit(500);

  if (iErr) throw new Error(`Failed to fetch dispatch items: ${iErr.message}`);

  const rows = (data ?? []) as unknown as RecentItemRow[];

  // Filter to received, non-deleted, within 90 days
  const filteredItems = rows.filter((i) => {
    const d = i.dispatch;
    if (!d) return false;
    if (d.status !== 'received') return false;
    if (d.deleted_at !== null) return false;
    if (!d.received_at || d.received_at < defaultFrom) return false;
    return true;
  });

  if (filteredItems.length === 0) return [];

  // Collect IDs for parallel lookups
  const commodityIds = new Set(filteredItems.map((i) => i.commodity_id));
  const locationIds = new Set<string>();
  for (const i of filteredItems) {
    locationIds.add(i.dispatch!.origin_location_id);
    locationIds.add(i.dispatch!.dest_location_id);
  }

  // Fetch commodities and locations in parallel
  const [commoditiesResult, locationsResult] = await Promise.all([
    client
      .from('commodities')
      .select('id, name')
      .in('id', Array.from(commodityIds)),
    client
      .from('locations')
      .select('id, name')
      .in('id', Array.from(locationIds)),
  ]);

  if (commoditiesResult.error)
    throw new Error(`Failed to fetch items: ${commoditiesResult.error.message}`);
  if (locationsResult.error)
    throw new Error(`Failed to fetch locations: ${locationsResult.error.message}`);

  const comMap = new Map(
    ((commoditiesResult.data ?? []) as unknown as CommodityRow[]).map((c) => [
      c.id,
      c.name,
    ])
  );
  const locMap = new Map(
    ((locationsResult.data ?? []) as unknown as LocationRow[]).map((l) => [
      l.id,
      l.name,
    ])
  );

  // Build result, sort by received_at desc, limit
  const result: RecentShortageItem[] = filteredItems
    .map((item) => {
      const d = item.dispatch!;
      return {
        id: item.id,
        dispatch_id: item.dispatch_id,
        dispatch_number: d.dispatch_number,
        commodity_name: comMap.get(item.commodity_id) ?? 'Unknown',
        origin_name: locMap.get(d.origin_location_id) ?? 'Unknown',
        dest_name: locMap.get(d.dest_location_id) ?? 'Unknown',
        sent_quantity: toNum(item.sent_quantity),
        received_quantity: toNum(item.received_quantity),
        shortage: toNum(item.shortage),
        shortage_percent: toNum(item.shortage_percent),
        received_at: d.received_at!,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )
    .slice(0, limit);

  return result;
}
