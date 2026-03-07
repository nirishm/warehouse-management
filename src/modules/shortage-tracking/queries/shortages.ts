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
// Queries
// ---------------------------------------------------------------------------

/**
 * Aggregate overview stats across all received dispatches.
 */
export async function getShortageOverview(
  schemaName: string
): Promise<ShortageOverview> {
  const client = createTenantClient(schemaName);

  // Get all received dispatches
  const { data: dispatches, error: dErr } = await client
    .from('dispatches')
    .select('id')
    .eq('status', 'received')
    .is('deleted_at', null);

  if (dErr) throw new Error(`Failed to fetch dispatches: ${dErr.message}`);

  const dispatchIds = (dispatches ?? []).map((d) => d.id);
  if (dispatchIds.length === 0) {
    return {
      total_received_dispatches: 0,
      items_with_shortage: 0,
      avg_shortage_percent: 0,
      max_shortage_percent: 0,
      total_quantity_lost: 0,
    };
  }

  // Get all dispatch items for received dispatches
  const { data: items, error: iErr } = await client
    .from('dispatch_items')
    .select('shortage, shortage_percent, received_quantity')
    .in('dispatch_id', dispatchIds);

  if (iErr) throw new Error(`Failed to fetch dispatch items: ${iErr.message}`);

  const allItems = items ?? [];
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
  const maxPct =
    percents.length > 0 ? Math.max(...percents) : 0;

  return {
    total_received_dispatches: dispatchIds.length,
    items_with_shortage: shortageItems.length,
    avg_shortage_percent: Math.round(avgPct * 100) / 100,
    max_shortage_percent: Math.round(maxPct * 100) / 100,
    total_quantity_lost: Math.round(totalLost * 100) / 100,
  };
}

/**
 * Shortage grouped by route (origin -> destination).
 */
export async function getShortageByRoute(
  schemaName: string
): Promise<ShortageByRoute[]> {
  const client = createTenantClient(schemaName);

  // Get received dispatches with location info
  const { data: dispatches, error: dErr } = await client
    .from('dispatches')
    .select('id, origin_location_id, dest_location_id')
    .eq('status', 'received')
    .is('deleted_at', null);

  if (dErr) throw new Error(`Failed to fetch dispatches: ${dErr.message}`);
  if (!dispatches || dispatches.length === 0) return [];

  const dispatchIds = dispatches.map((d) => d.id);

  // Get dispatch items
  const { data: items, error: iErr } = await client
    .from('dispatch_items')
    .select(
      'dispatch_id, sent_quantity, received_quantity, shortage, shortage_percent'
    )
    .in('dispatch_id', dispatchIds);

  if (iErr) throw new Error(`Failed to fetch dispatch items: ${iErr.message}`);

  // Get all locations
  const locationIds = new Set<string>();
  dispatches.forEach((d) => {
    locationIds.add(d.origin_location_id);
    locationIds.add(d.dest_location_id);
  });

  const { data: locations, error: lErr } = await client
    .from('locations')
    .select('id, name')
    .in('id', Array.from(locationIds));

  if (lErr) throw new Error(`Failed to fetch locations: ${lErr.message}`);

  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]));

  // Build dispatch -> route mapping
  const dispatchMap = new Map(
    dispatches.map((d) => [
      d.id,
      { origin: d.origin_location_id, dest: d.dest_location_id },
    ])
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

  for (const item of items ?? []) {
    const route = dispatchMap.get(item.dispatch_id);
    if (!route) continue;
    const key = `${route.origin}|${route.dest}`;

    if (!routeAgg.has(key)) {
      routeAgg.set(key, {
        origin_location_id: route.origin,
        dest_location_id: route.dest,
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
 */
export async function getShortageByTransporter(
  schemaName: string
): Promise<ShortageByTransporter[]> {
  const client = createTenantClient(schemaName);

  // Get received dispatches with transporter
  const { data: dispatches, error: dErr } = await client
    .from('dispatches')
    .select('id, transporter_name')
    .eq('status', 'received')
    .is('deleted_at', null);

  if (dErr) throw new Error(`Failed to fetch dispatches: ${dErr.message}`);
  if (!dispatches || dispatches.length === 0) return [];

  const dispatchIds = dispatches.map((d) => d.id);

  const { data: items, error: iErr } = await client
    .from('dispatch_items')
    .select('dispatch_id, shortage, shortage_percent')
    .in('dispatch_id', dispatchIds);

  if (iErr) throw new Error(`Failed to fetch dispatch items: ${iErr.message}`);

  const dispatchTransporter = new Map(
    dispatches.map((d) => [d.id, d.transporter_name ?? 'Unknown'])
  );

  const transporterAgg = new Map<
    string,
    {
      dispatchIds: Set<string>;
      total_shortage: number;
      percents: number[];
    }
  >();

  for (const item of items ?? []) {
    const name = dispatchTransporter.get(item.dispatch_id) ?? 'Unknown';

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
 */
export async function getShortageByCommodity(
  schemaName: string
): Promise<ShortageByCommodity[]> {
  const client = createTenantClient(schemaName);

  // Get received dispatches
  const { data: dispatches, error: dErr } = await client
    .from('dispatches')
    .select('id')
    .eq('status', 'received')
    .is('deleted_at', null);

  if (dErr) throw new Error(`Failed to fetch dispatches: ${dErr.message}`);
  if (!dispatches || dispatches.length === 0) return [];

  const dispatchIds = dispatches.map((d) => d.id);

  const { data: items, error: iErr } = await client
    .from('dispatch_items')
    .select(
      'dispatch_id, commodity_id, sent_quantity, shortage, shortage_percent'
    )
    .in('dispatch_id', dispatchIds);

  if (iErr) throw new Error(`Failed to fetch dispatch items: ${iErr.message}`);

  // Get all commodities
  const commodityIds = new Set(
    (items ?? []).map((i) => i.commodity_id as string)
  );
  const { data: commodities, error: cErr } = await client
    .from('commodities')
    .select('id, name')
    .in('id', Array.from(commodityIds));

  if (cErr) throw new Error(`Failed to fetch commodities: ${cErr.message}`);

  const comMap = new Map(
    (commodities ?? []).map((c) => [c.id, c.name as string])
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

  for (const item of items ?? []) {
    const cid = item.commodity_id as string;

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
 */
export async function getRecentShortages(
  schemaName: string,
  limit: number = 20
): Promise<RecentShortageItem[]> {
  const client = createTenantClient(schemaName);

  // Get received dispatches ordered by received_at desc
  const { data: dispatches, error: dErr } = await client
    .from('dispatches')
    .select(
      'id, dispatch_number, origin_location_id, dest_location_id, received_at'
    )
    .eq('status', 'received')
    .is('deleted_at', null)
    .order('received_at', { ascending: false });

  if (dErr) throw new Error(`Failed to fetch dispatches: ${dErr.message}`);
  if (!dispatches || dispatches.length === 0) return [];

  const dispatchIds = dispatches.map((d) => d.id);

  // Get items with shortage > 0
  const { data: items, error: iErr } = await client
    .from('dispatch_items')
    .select(
      'id, dispatch_id, commodity_id, sent_quantity, received_quantity, shortage, shortage_percent'
    )
    .in('dispatch_id', dispatchIds)
    .gt('shortage', 0);

  if (iErr) throw new Error(`Failed to fetch dispatch items: ${iErr.message}`);
  if (!items || items.length === 0) return [];

  // Get commodity names
  const commodityIds = new Set(items.map((i) => i.commodity_id as string));
  const { data: commodities, error: cErr } = await client
    .from('commodities')
    .select('id, name')
    .in('id', Array.from(commodityIds));

  if (cErr) throw new Error(`Failed to fetch commodities: ${cErr.message}`);

  const comMap = new Map(
    (commodities ?? []).map((c) => [c.id, c.name as string])
  );

  // Get location names
  const locationIds = new Set<string>();
  dispatches.forEach((d) => {
    locationIds.add(d.origin_location_id);
    locationIds.add(d.dest_location_id);
  });

  const { data: locations, error: lErr } = await client
    .from('locations')
    .select('id, name')
    .in('id', Array.from(locationIds));

  if (lErr) throw new Error(`Failed to fetch locations: ${lErr.message}`);

  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]));

  const dispatchMap = new Map(
    dispatches.map((d) => [
      d.id,
      {
        dispatch_number: d.dispatch_number as string,
        origin_location_id: d.origin_location_id as string,
        dest_location_id: d.dest_location_id as string,
        received_at: d.received_at as string,
      },
    ])
  );

  // Build result, sort by received_at desc, limit
  const result: RecentShortageItem[] = items
    .map((item) => {
      const dispatch = dispatchMap.get(item.dispatch_id);
      if (!dispatch) return null;
      return {
        id: item.id,
        dispatch_id: item.dispatch_id,
        dispatch_number: dispatch.dispatch_number,
        commodity_name: comMap.get(item.commodity_id as string) ?? 'Unknown',
        origin_name:
          locMap.get(dispatch.origin_location_id) ?? 'Unknown',
        dest_name:
          locMap.get(dispatch.dest_location_id) ?? 'Unknown',
        sent_quantity: toNum(item.sent_quantity),
        received_quantity: toNum(item.received_quantity),
        shortage: toNum(item.shortage),
        shortage_percent: toNum(item.shortage_percent),
        received_at: dispatch.received_at,
      };
    })
    .filter((r): r is RecentShortageItem => r !== null)
    .sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )
    .slice(0, limit);

  return result;
}
