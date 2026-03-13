import { eq, and, ilike, isNull, sql, inArray, or } from 'drizzle-orm';
import type { LocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { transfers, transferItems, auditLog } from '@/core/db/schema';
import { getNextSequence } from '@/modules/inventory/queries/sequence';
import { ApiError } from '@/core/api/error-handler';
import { inngest } from '@/inngest/client';
import type { CreateTransferInput, UpdateTransferInput, ReceiveTransferInput } from '../validations/transfer';

type TransferRow = typeof transfers.$inferSelect;
type TransferItemRow = typeof transferItems.$inferSelect;

type TransferWithItems = TransferRow & { items: TransferItemRow[] };

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['dispatched'],
  dispatched: ['in_transit'],
  in_transit: ['received'],
  received: [],
};

export async function listTransfers(
  tenantId: string,
  filters?: {
    search?: string;
    status?: string;
    originLocationId?: string;
    destLocationId?: string;
    locationScope?: LocationScope;
  },
  pagination?: { limit: number; offset: number },
) {
  if (filters?.locationScope !== undefined && filters.locationScope !== null
      && filters.locationScope.length === 0) {
    return { data: [], total: 0 };
  }

  const conditions = [eq(transfers.tenantId, tenantId), isNull(transfers.deletedAt)];

  if (filters?.search) {
    conditions.push(ilike(transfers.transferNumber, `%${filters.search}%`));
  }
  if (filters?.status) {
    conditions.push(
      eq(transfers.status, filters.status as 'draft' | 'dispatched' | 'in_transit' | 'received'),
    );
  }
  if (filters?.originLocationId) {
    conditions.push(eq(transfers.originLocationId, filters.originLocationId));
  }
  if (filters?.destLocationId) {
    conditions.push(eq(transfers.destLocationId, filters.destLocationId));
  }
  if (filters?.locationScope && filters.locationScope.length > 0) {
    conditions.push(
      or(
        inArray(transfers.originLocationId, filters.locationScope),
        inArray(transfers.destLocationId, filters.locationScope),
      )!,
    );
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(transfers)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(sql`${transfers.createdAt} desc`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transfers)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getTransfer(
  tenantId: string,
  id: string,
  locationScope?: LocationScope,
): Promise<TransferWithItems | null> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return null;
  }

  const result = await db
    .select()
    .from(transfers)
    .where(
      and(eq(transfers.id, id), eq(transfers.tenantId, tenantId), isNull(transfers.deletedAt)),
    );

  if (!result[0]) return null;

  if (locationScope !== undefined && locationScope !== null) {
    const inOrigin = result[0].originLocationId ? locationScope.includes(result[0].originLocationId) : false;
    const inDest = result[0].destLocationId ? locationScope.includes(result[0].destLocationId) : false;
    if (!inOrigin && !inDest) return null;
  }

  const items = await db
    .select()
    .from(transferItems)
    .where(eq(transferItems.transferId, id));

  return { ...result[0], items };
}

export async function createTransfer(
  tenantId: string,
  data: CreateTransferInput,
  userId: string,
): Promise<TransferWithItems> {
  const transferNumber = await getNextSequence(tenantId, 'TFR', 'TFR');

  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(transfers, {
    transferNumber,
    originLocationId: data.originLocationId,
    destLocationId: data.destLocationId,
    notes: data.notes ?? null,
    updatedAt: new Date(),
  });

  const transfer = inserted[0] as TransferRow;

  const insertedItems = await db
    .insert(transferItems)
    .values(
      data.items.map((item) => ({
        transferId: transfer.id,
        itemId: item.itemId,
        unitId: item.unitId ?? null,
        sentQty: item.sentQty,
      })),
    )
    .returning();

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'transfer',
    entityId: transfer.id,
    newData: transfer,
  });

  return { ...transfer, items: insertedItems };
}

export async function updateTransfer(
  tenantId: string,
  id: string,
  data: UpdateTransferInput,
  userId: string,
): Promise<TransferWithItems | null> {
  const old = await getTransfer(tenantId, id);
  if (!old) return null;

  if (old.status !== 'draft') {
    throw new ApiError(400, 'Only draft transfers can be updated', 'INVALID_STATE');
  }

  const result = await db
    .update(transfers)
    .set({
      ...(data.originLocationId !== undefined && { originLocationId: data.originLocationId }),
      ...(data.destLocationId !== undefined && { destLocationId: data.destLocationId }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    })
    .where(
      and(eq(transfers.id, id), eq(transfers.tenantId, tenantId), isNull(transfers.deletedAt)),
    )
    .returning();

  if (result.length === 0) return null;

  const updated = result[0];
  let updatedItems: TransferItemRow[] = old.items;

  if (data.items !== undefined) {
    // Delete existing items and re-insert
    await db.delete(transferItems).where(eq(transferItems.transferId, id));

    if (data.items.length > 0) {
      updatedItems = await db
        .insert(transferItems)
        .values(
          data.items.map((item) => ({
            transferId: id,
            itemId: item.itemId,
            unitId: item.unitId ?? null,
            sentQty: item.sentQty,
          })),
        )
        .returning();
    } else {
      updatedItems = [];
    }
  }

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'update',
    entityType: 'transfer',
    entityId: id,
    oldData: old,
    newData: updated,
  });

  return { ...updated, items: updatedItems };
}

export async function updateTransferStatus(
  tenantId: string,
  id: string,
  status: 'draft' | 'dispatched' | 'in_transit' | 'received',
  userId: string,
): Promise<TransferWithItems | null> {
  const existing = await getTransfer(tenantId, id);
  if (!existing) return null;

  const allowedTransitions = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowedTransitions.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status transition from '${existing.status}' to '${status}'`,
      'INVALID_TRANSITION',
    );
  }

  const result = await db
    .update(transfers)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(transfers.id, id), eq(transfers.tenantId, tenantId), isNull(transfers.deletedAt)),
    )
    .returning();

  if (result.length === 0) return null;

  const updated = result[0];

  if (status === 'dispatched') {
    await inngest.send({
      name: 'transfer/dispatched',
      data: { transferId: id, tenantId },
    });
  }

  if (status === 'received') {
    await inngest.send({
      name: 'transfer/received',
      data: { transferId: id, tenantId },
    });
  }

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'status_change',
    entityType: 'transfer',
    entityId: id,
    oldData: { status: existing.status },
    newData: { status },
  });

  return { ...updated, items: existing.items };
}

export async function receiveTransfer(
  tenantId: string,
  id: string,
  data: ReceiveTransferInput,
  userId: string,
): Promise<TransferWithItems | null> {
  const existing = await getTransfer(tenantId, id);
  if (!existing) return null;

  if (existing.status !== 'dispatched' && existing.status !== 'in_transit') {
    throw new ApiError(
      400,
      `Transfer must be dispatched or in_transit to receive (current: ${existing.status})`,
      'INVALID_STATE',
    );
  }

  // Update each transfer item with received qty and computed shortage
  for (const item of data.items) {
    const existingItem = await db
      .select()
      .from(transferItems)
      .where(eq(transferItems.id, item.id));

    if (existingItem[0]) {
      const sentQty = Number(existingItem[0].sentQty);
      const recvQty = Number(item.receivedQty);
      const shortageNum = sentQty - recvQty;
      const shortage = shortageNum > 0 ? String(shortageNum) : '0';

      await db
        .update(transferItems)
        .set({
          receivedQty: item.receivedQty,
          shortage,
        })
        .where(eq(transferItems.id, item.id));
    }
  }

  // Update transfer status to received
  const result = await db
    .update(transfers)
    .set({ status: 'received', updatedAt: new Date() })
    .where(
      and(eq(transfers.id, id), eq(transfers.tenantId, tenantId), isNull(transfers.deletedAt)),
    )
    .returning();

  if (result.length === 0) return null;

  await inngest.send({
    name: 'transfer/received',
    data: { transferId: id, tenantId },
  });

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'status_change',
    entityType: 'transfer',
    entityId: id,
    oldData: { status: existing.status },
    newData: { status: 'received' },
  });

  // Return updated transfer with fresh items
  const updatedItems = await db
    .select()
    .from(transferItems)
    .where(eq(transferItems.transferId, id));

  return { ...result[0], items: updatedItems };
}

export async function softDeleteTransfer(
  tenantId: string,
  id: string,
  userId: string,
): Promise<TransferRow | null> {
  const existing = await getTransfer(tenantId, id);
  if (!existing) return null;

  if (existing.status !== 'draft') {
    throw new ApiError(400, 'Only draft transfers can be deleted', 'INVALID_STATE');
  }

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(transfers, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'transfer',
    entityId: id,
    oldData: existing,
  });

  return existing;
}
