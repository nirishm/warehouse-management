import { eq, and, isNull, inArray, sql, or } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { queryStockLevels } from '@/core/db/stock-levels';
import { items, sales, saleItems, purchases, purchaseItems, transfers } from '@/core/db/schema';
import type { LocationScope } from '@/core/db/location-scope';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Period {
  from?: string;
  to?: string;
}

export interface StockValueResult {
  total: number;
}

export interface ItemsBelowReorderResult {
  count: number;
}

export interface OpenOrdersCountResult {
  purchases: number;
  sales: number;
  total: number;
}

export interface InTransitCountResult {
  count: number;
}

export interface RevenueResult {
  total: number;
}

export interface TopSellingItem {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface StockMovementDay {
  date: string;
  inbound: number;
  outbound: number;
}

export interface DashboardAnalytics {
  kpis: {
    stockValue: StockValueResult;
    itemsBelowReorder: ItemsBelowReorderResult;
    openOrders: OpenOrdersCountResult;
    inTransitTransfers: InTransitCountResult;
    revenue: RevenueResult;
  };
  topSellingItems: TopSellingItem[];
  stockMovement: StockMovementDay[];
}

// ---------------------------------------------------------------------------
// Sub-functions
// ---------------------------------------------------------------------------

/**
 * Sum of (currentStock * sellingPrice) across all active items for the tenant.
 * stock_levels returns one row per (item, location, unit) — we collapse per item
 * by summing currentStock first, then multiply by the item's sellingPrice.
 */
export async function getStockValue(tenantId: string, locationScope?: LocationScope): Promise<StockValueResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { total: 0 };
  }
  // Aggregate stock per item across scoped locations
  const stockLevels = await queryStockLevels(db, tenantId,
    locationScope ? { locationIds: locationScope } : undefined,
  );

  if (stockLevels.length === 0) {
    return { total: 0 };
  }

  // Sum currentStock per itemId
  const stockByItem = new Map<string, number>();
  for (const row of stockLevels) {
    stockByItem.set(row.itemId, (stockByItem.get(row.itemId) ?? 0) + row.currentStock);
  }

  const itemIds = [...stockByItem.keys()];

  // Fetch sellingPrice for those items
  const itemRows = await db
    .select({ id: items.id, sellingPrice: items.sellingPrice })
    .from(items)
    .where(
      and(
        eq(items.tenantId, tenantId),
        isNull(items.deletedAt),
        inArray(items.id, itemIds),
      ),
    );

  let total = 0;
  for (const item of itemRows) {
    const stock = stockByItem.get(item.id) ?? 0;
    const price = Number(item.sellingPrice ?? 0);
    total += stock * price;
  }

  return { total };
}

/**
 * Count of items where currentStock (summed across locations) < item.reorderLevel.
 */
export async function getItemsBelowReorder(tenantId: string, locationScope?: LocationScope): Promise<ItemsBelowReorderResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { count: 0 };
  }
  const stockLevels = await queryStockLevels(db, tenantId,
    locationScope ? { locationIds: locationScope } : undefined,
  );

  // Sum stock per item across all locations
  const stockByItem = new Map<string, number>();
  for (const row of stockLevels) {
    stockByItem.set(row.itemId, (stockByItem.get(row.itemId) ?? 0) + row.currentStock);
  }

  if (stockByItem.size === 0) {
    return { count: 0 };
  }

  // Fetch reorderLevel for all active items in this tenant that have a reorderLevel set
  const itemRows = await db
    .select({ id: items.id, reorderLevel: items.reorderLevel })
    .from(items)
    .where(
      and(
        eq(items.tenantId, tenantId),
        isNull(items.deletedAt),
      ),
    );

  let count = 0;
  for (const item of itemRows) {
    if (item.reorderLevel === null || item.reorderLevel === undefined) continue;
    const stock = stockByItem.get(item.id) ?? 0;
    if (stock < item.reorderLevel) {
      count++;
    }
  }

  return { count };
}

/**
 * Count open purchase orders (draft|ordered) and open sales (draft|confirmed).
 */
export async function getOpenOrdersCount(tenantId: string, locationScope?: LocationScope): Promise<OpenOrdersCountResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { purchases: 0, sales: 0, total: 0 };
  }

  const purchaseConditions = [
    eq(purchases.tenantId, tenantId),
    isNull(purchases.deletedAt),
    inArray(purchases.status, ['draft', 'ordered']),
  ];
  if (locationScope && locationScope.length > 0) {
    purchaseConditions.push(inArray(purchases.locationId, locationScope));
  }

  const saleConditions = [
    eq(sales.tenantId, tenantId),
    isNull(sales.deletedAt),
    inArray(sales.status, ['draft', 'confirmed']),
  ];
  if (locationScope && locationScope.length > 0) {
    saleConditions.push(inArray(sales.locationId, locationScope));
  }

  const [purchaseResult, salesResult] = await Promise.all([
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(purchases)
      .where(and(...purchaseConditions)),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(sales)
      .where(and(...saleConditions)),
  ]);

  const purchasesCount = Number(purchaseResult[0]?.count ?? 0);
  const salesCount = Number(salesResult[0]?.count ?? 0);

  return {
    purchases: purchasesCount,
    sales: salesCount,
    total: purchasesCount + salesCount,
  };
}

/**
 * Count transfers with status 'dispatched' or 'in_transit'.
 */
export async function getInTransitCount(tenantId: string, locationScope?: LocationScope): Promise<InTransitCountResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { count: 0 };
  }

  const conditions = [
    eq(transfers.tenantId, tenantId),
    isNull(transfers.deletedAt),
    inArray(transfers.status, ['dispatched', 'in_transit']),
  ];
  if (locationScope && locationScope.length > 0) {
    conditions.push(
      or(
        inArray(transfers.originLocationId, locationScope),
        inArray(transfers.destLocationId, locationScope),
      )!,
    );
  }

  const result = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(transfers)
    .where(and(...conditions));

  return { count: Number(result[0]?.count ?? 0) };
}

/**
 * Sum of (quantity * unitPrice) for confirmed/dispatched sales, with optional date range.
 */
export async function getRevenue(tenantId: string, period?: Period, locationScope?: LocationScope): Promise<RevenueResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { total: 0 };
  }
  // Build date conditions on sales.createdAt
  const saleDateConditions = [
    eq(sales.tenantId, tenantId),
    isNull(sales.deletedAt),
    inArray(sales.status, ['confirmed', 'dispatched']),
  ];
  if (locationScope && locationScope.length > 0) {
    saleDateConditions.push(inArray(sales.locationId, locationScope));
  }

  if (period?.from) {
    saleDateConditions.push(
      sql`${sales.createdAt} >= ${new Date(period.from).toISOString()}::timestamptz`,
    );
  }
  if (period?.to) {
    saleDateConditions.push(
      sql`${sales.createdAt} <= ${new Date(period.to).toISOString()}::timestamptz`,
    );
  }

  const result = await db
    .select({
      total: sql<number>`cast(coalesce(sum(cast(${saleItems.quantity} as numeric) * cast(${saleItems.unitPrice} as numeric)), 0) as float8)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(...saleDateConditions));

  return { total: Number(result[0]?.total ?? 0) };
}

/**
 * Top selling items by quantity for confirmed/dispatched sales, optional date range.
 * Returns up to `limit` items sorted by totalQuantity descending.
 */
export async function getTopSellingItems(
  tenantId: string,
  period?: Period,
  limit = 10,
  locationScope?: LocationScope,
): Promise<TopSellingItem[]> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return [];
  }
  const saleDateConditions = [
    eq(sales.tenantId, tenantId),
    isNull(sales.deletedAt),
    inArray(sales.status, ['confirmed', 'dispatched']),
  ];
  if (locationScope && locationScope.length > 0) {
    saleDateConditions.push(inArray(sales.locationId, locationScope));
  }

  if (period?.from) {
    saleDateConditions.push(
      sql`${sales.createdAt} >= ${new Date(period.from).toISOString()}::timestamptz`,
    );
  }
  if (period?.to) {
    saleDateConditions.push(
      sql`${sales.createdAt} <= ${new Date(period.to).toISOString()}::timestamptz`,
    );
  }

  const rows = await db
    .select({
      itemId: saleItems.itemId,
      itemName: items.name,
      totalQuantity: sql<number>`cast(sum(cast(${saleItems.quantity} as numeric)) as float8)`,
      totalRevenue: sql<number>`cast(sum(cast(${saleItems.quantity} as numeric) * cast(${saleItems.unitPrice} as numeric)) as float8)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(items, and(eq(saleItems.itemId, items.id), isNull(items.deletedAt)))
    .where(and(...saleDateConditions))
    .groupBy(saleItems.itemId, items.name)
    .orderBy(sql`sum(cast(${saleItems.quantity} as numeric)) desc`)
    .limit(limit);

  return rows.map((row) => ({
    itemId: row.itemId,
    itemName: row.itemName,
    totalQuantity: Number(row.totalQuantity),
    totalRevenue: Number(row.totalRevenue),
  }));
}

/**
 * Daily inbound (purchases received) and outbound (sales confirmed/dispatched)
 * for the last 7 days, or within the specified period.
 *
 * Returns one entry per calendar day within the window, filling gaps with zeros.
 */
export async function getStockMovement(
  tenantId: string,
  period?: Period,
  locationScope?: LocationScope,
): Promise<StockMovementDay[]> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return [];
  }
  // Default: last 7 days (today - 6 days .. today)
  const toDate = period?.to ? new Date(period.to) : new Date();
  const fromDate = period?.from
    ? new Date(period.from)
    : new Date(toDate.getTime() - 6 * 24 * 60 * 60 * 1000);

  // Truncate to date boundaries
  toDate.setHours(23, 59, 59, 999);
  fromDate.setHours(0, 0, 0, 0);

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // Inbound: purchases with status 'received'
  const inboundJoinConditions = [
    eq(purchaseItems.purchaseId, purchases.id),
    eq(purchases.tenantId, tenantId),
    isNull(purchases.deletedAt),
    eq(purchases.status, 'received'),
    sql`${purchases.createdAt} >= ${fromIso}::timestamptz`,
    sql`${purchases.createdAt} <= ${toIso}::timestamptz`,
  ];
  if (locationScope && locationScope.length > 0) {
    inboundJoinConditions.push(inArray(purchases.locationId, locationScope));
  }

  const inboundRows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${purchases.createdAt}), 'YYYY-MM-DD')`,
      qty: sql<number>`cast(coalesce(sum(cast(${purchaseItems.quantity} as numeric)), 0) as float8)`,
    })
    .from(purchaseItems)
    .innerJoin(
      purchases,
      and(...inboundJoinConditions),
    )
    .groupBy(sql`date_trunc('day', ${purchases.createdAt})`)
    .orderBy(sql`date_trunc('day', ${purchases.createdAt})`);

  // Outbound: sales with status 'confirmed' or 'dispatched'
  const outboundJoinConditions = [
    eq(saleItems.saleId, sales.id),
    eq(sales.tenantId, tenantId),
    isNull(sales.deletedAt),
    inArray(sales.status, ['confirmed', 'dispatched']),
    sql`${sales.createdAt} >= ${fromIso}::timestamptz`,
    sql`${sales.createdAt} <= ${toIso}::timestamptz`,
  ];
  if (locationScope && locationScope.length > 0) {
    outboundJoinConditions.push(inArray(sales.locationId, locationScope));
  }

  const outboundRows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${sales.createdAt}), 'YYYY-MM-DD')`,
      qty: sql<number>`cast(coalesce(sum(cast(${saleItems.quantity} as numeric)), 0) as float8)`,
    })
    .from(saleItems)
    .innerJoin(
      sales,
      and(...outboundJoinConditions),
    )
    .groupBy(sql`date_trunc('day', ${sales.createdAt})`)
    .orderBy(sql`date_trunc('day', ${sales.createdAt})`);

  // Build a map for O(1) lookup
  const inboundByDate = new Map(inboundRows.map((r) => [r.date, Number(r.qty)]));
  const outboundByDate = new Map(outboundRows.map((r) => [r.date, Number(r.qty)]));

  // Fill every calendar day in the window
  const result: StockMovementDay[] = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    const dateKey = cursor.toISOString().slice(0, 10); // YYYY-MM-DD
    result.push({
      date: dateKey,
      inbound: inboundByDate.get(dateKey) ?? 0,
      outbound: outboundByDate.get(dateKey) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function getDashboardAnalytics(
  tenantId: string,
  period?: Period,
  locationScope?: LocationScope,
): Promise<DashboardAnalytics> {
  const [
    stockValue,
    itemsBelowReorder,
    openOrders,
    inTransitTransfers,
    revenue,
    topSellingItems,
    stockMovement,
  ] = await Promise.all([
    getStockValue(tenantId, locationScope),
    getItemsBelowReorder(tenantId, locationScope),
    getOpenOrdersCount(tenantId, locationScope),
    getInTransitCount(tenantId, locationScope),
    getRevenue(tenantId, period, locationScope),
    getTopSellingItems(tenantId, period, 10, locationScope),
    getStockMovement(tenantId, period, locationScope),
  ]);

  return {
    kpis: {
      stockValue,
      itemsBelowReorder,
      openOrders,
      inTransitTransfers,
      revenue,
    },
    topSellingItems,
    stockMovement,
  };
}
