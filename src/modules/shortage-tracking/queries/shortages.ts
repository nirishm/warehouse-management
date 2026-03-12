import { eq, and, gt, isNull, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { transfers, transferItems } from '@/core/db/schema';

export async function listShortages(
  tenantId: string,
  filters?: {
    locationId?: string;
    dateFrom?: string;
    dateTo?: string;
  },
  pagination?: { limit: number; offset: number },
) {
  const conditions = [
    eq(transfers.tenantId, tenantId),
    eq(transfers.status, 'received'),
    isNull(transfers.deletedAt),
    gt(transferItems.shortage, '0'),
  ];

  if (filters?.locationId) {
    // Filter by either origin or destination location
    conditions.push(
      sql`(${transfers.originLocationId} = ${filters.locationId} OR ${transfers.destLocationId} = ${filters.locationId})`,
    );
  }
  if (filters?.dateFrom) {
    conditions.push(gte(transfers.createdAt, new Date(filters.dateFrom)));
  }
  if (filters?.dateTo) {
    conditions.push(lte(transfers.createdAt, new Date(filters.dateTo)));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select({
        transferId: transfers.id,
        transferNumber: transfers.transferNumber,
        originLocationId: transfers.originLocationId,
        destLocationId: transfers.destLocationId,
        transferDate: transfers.createdAt,
        itemId: transferItems.itemId,
        unitId: transferItems.unitId,
        sentQty: transferItems.sentQty,
        receivedQty: transferItems.receivedQty,
        shortage: transferItems.shortage,
      })
      .from(transferItems)
      .innerJoin(transfers, eq(transferItems.transferId, transfers.id))
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(transfers.createdAt),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transferItems)
      .innerJoin(transfers, eq(transferItems.transferId, transfers.id))
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}
