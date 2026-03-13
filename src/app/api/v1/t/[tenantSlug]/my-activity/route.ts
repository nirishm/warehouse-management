import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray, and } from 'drizzle-orm';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { listAuditEntries } from '@/modules/audit-trail/queries/audit';
import { db } from '@/core/db/drizzle';
import {
  transferItems, transfers,
  purchaseItems, purchases,
  saleItems, sales,
  items, units,
} from '@/core/db/schema';

/** Returns a map of entityId → "Item Name · qty unit" for the first item of each entity. */
async function fetchFirstItemSummaries(
  tenantId: string,
  byType: Record<string, string[]>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  function format(name: string, qty: string, unit: string | null) {
    return unit ? `${name} · ${qty} ${unit}` : `${name} · ${qty}`;
  }

  const queries: Promise<void>[] = [];

  if (byType.transfer?.length) {
    queries.push(
      db.select({
        entityId: transferItems.transferId,
        name: items.name,
        qty: transferItems.sentQty,
        unit: units.name,
      })
        .from(transferItems)
        .innerJoin(transfers, eq(transfers.id, transferItems.transferId))
        .innerJoin(items, eq(items.id, transferItems.itemId))
        .leftJoin(units, eq(units.id, transferItems.unitId))
        .where(and(
          eq(transfers.tenantId, tenantId),
          inArray(transferItems.transferId, byType.transfer),
        ))
        .then((rows) => {
          const seen = new Set<string>();
          for (const r of rows) {
            if (!seen.has(r.entityId)) {
              seen.add(r.entityId);
              map.set(r.entityId, format(r.name, r.qty, r.unit ?? null));
            }
          }
        }),
    );
  }

  if (byType.purchase?.length) {
    queries.push(
      db.select({
        entityId: purchaseItems.purchaseId,
        name: items.name,
        qty: purchaseItems.quantity,
        unit: units.name,
      })
        .from(purchaseItems)
        .innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
        .innerJoin(items, eq(items.id, purchaseItems.itemId))
        .leftJoin(units, eq(units.id, purchaseItems.unitId))
        .where(and(
          eq(purchases.tenantId, tenantId),
          inArray(purchaseItems.purchaseId, byType.purchase),
        ))
        .then((rows) => {
          const seen = new Set<string>();
          for (const r of rows) {
            if (!seen.has(r.entityId)) {
              seen.add(r.entityId);
              map.set(r.entityId, format(r.name, r.qty, r.unit ?? null));
            }
          }
        }),
    );
  }

  if (byType.sale?.length) {
    queries.push(
      db.select({
        entityId: saleItems.saleId,
        name: items.name,
        qty: saleItems.quantity,
        unit: units.name,
      })
        .from(saleItems)
        .innerJoin(sales, eq(sales.id, saleItems.saleId))
        .innerJoin(items, eq(items.id, saleItems.itemId))
        .leftJoin(units, eq(units.id, saleItems.unitId))
        .where(and(
          eq(sales.tenantId, tenantId),
          inArray(saleItems.saleId, byType.sale),
        ))
        .then((rows) => {
          const seen = new Set<string>();
          for (const r of rows) {
            if (!seen.has(r.entityId)) {
              seen.add(r.entityId);
              map.set(r.entityId, format(r.name, r.qty, r.unit ?? null));
            }
          }
        }),
    );
  }

  await Promise.all(queries);
  return map;
}

export const GET = withTenantContext(
  async (_req: NextRequest, ctx) => {
    try {
      const { data } = await listAuditEntries(
        ctx.tenantId,
        { userId: ctx.userId },
        { limit: 20, offset: 0 },
      );

      // Group entityIds by type for batch item lookup
      const byType: Record<string, string[]> = {};
      for (const entry of data) {
        if (!byType[entry.entityType]) byType[entry.entityType] = [];
        byType[entry.entityType].push(entry.entityId);
      }

      const itemSummaries = await fetchFirstItemSummaries(ctx.tenantId, byType);

      const entries = data.map((entry) => {
        const newData = entry.newData as Record<string, unknown> | null;
        const sequenceNumber =
          newData && typeof newData === 'object' && 'sequenceNumber' in newData
            ? String(newData.sequenceNumber)
            : null;

        const description = sequenceNumber
          ? sequenceNumber
          : entry.entityType.charAt(0).toUpperCase() + entry.entityType.slice(1);

        return {
          id: entry.id,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          description,
          summary: itemSummaries.get(entry.entityId) ?? null,
          createdAt: entry.createdAt,
        };
      });

      return NextResponse.json({ entries });
    } catch (error) {
      return errorResponse(error);
    }
  },
);
