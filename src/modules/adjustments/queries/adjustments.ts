import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { adjustments, adjustmentItems, auditLog } from '@/core/db/schema';
import { getNextSequence } from '@/modules/inventory/queries/sequence';
import { ApiError } from '@/core/api/error-handler';
import { inngest } from '@/inngest/client';
import type { CreateAdjustmentInput, UpdateAdjustmentInput } from '../validations/adjustment';

type AdjustmentRow = typeof adjustments.$inferSelect;
type AdjustmentItemRow = typeof adjustmentItems.$inferSelect;

type AdjustmentWithItems = AdjustmentRow & { items: AdjustmentItemRow[] };

export async function listAdjustments(
  tenantId: string,
  filters?: {
    search?: string;
    status?: string;
    locationId?: string;
    type?: string;
  },
  pagination?: { limit: number; offset: number },
) {
  const conditions = [eq(adjustments.tenantId, tenantId), isNull(adjustments.deletedAt)];

  if (filters?.search) {
    conditions.push(ilike(adjustments.adjustmentNumber, `%${filters.search}%`));
  }
  if (filters?.status) {
    conditions.push(
      eq(adjustments.status, filters.status as 'draft' | 'approved'),
    );
  }
  if (filters?.locationId) {
    conditions.push(eq(adjustments.locationId, filters.locationId));
  }
  if (filters?.type) {
    conditions.push(eq(adjustments.type, filters.type as 'qty' | 'value'));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(adjustments)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(sql`${adjustments.createdAt} desc`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(adjustments)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getAdjustment(
  tenantId: string,
  id: string,
): Promise<AdjustmentWithItems | null> {
  const result = await db
    .select()
    .from(adjustments)
    .where(
      and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId), isNull(adjustments.deletedAt)),
    );

  if (!result[0]) return null;

  const items = await db
    .select()
    .from(adjustmentItems)
    .where(eq(adjustmentItems.adjustmentId, id));

  return { ...result[0], items };
}

export async function createAdjustment(
  tenantId: string,
  data: CreateAdjustmentInput,
  userId: string,
): Promise<AdjustmentWithItems> {
  const adjustmentNumber = await getNextSequence(tenantId, 'ADJ', 'ADJ');

  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(adjustments, {
    adjustmentNumber,
    locationId: data.locationId,
    reason: data.reason ?? null,
    type: data.type,
    status: 'draft',
    notes: data.notes ?? null,
    updatedAt: new Date(),
  });

  const adjustment = inserted[0] as AdjustmentRow;

  const insertedItems = await db
    .insert(adjustmentItems)
    .values(
      data.items.map((item) => ({
        adjustmentId: adjustment.id,
        itemId: item.itemId,
        unitId: item.unitId ?? null,
        qtyChange: item.qtyChange ?? null,
        valueChange: item.valueChange ?? null,
      })),
    )
    .returning();

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'adjustment',
    entityId: adjustment.id,
    newData: adjustment,
  });

  return { ...adjustment, items: insertedItems };
}

export async function updateAdjustment(
  tenantId: string,
  id: string,
  data: UpdateAdjustmentInput,
  userId: string,
): Promise<AdjustmentWithItems | null> {
  const old = await getAdjustment(tenantId, id);
  if (!old) return null;

  if (old.status !== 'draft') {
    throw new ApiError(400, 'Only draft adjustments can be updated', 'INVALID_STATE');
  }

  const result = await db
    .update(adjustments)
    .set({
      ...(data.locationId !== undefined && { locationId: data.locationId }),
      ...(data.reason !== undefined && { reason: data.reason }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    })
    .where(
      and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId), isNull(adjustments.deletedAt)),
    )
    .returning();

  if (result.length === 0) return null;

  const updated = result[0];
  let updatedItems: AdjustmentItemRow[] = old.items;

  if (data.items !== undefined) {
    await db.delete(adjustmentItems).where(eq(adjustmentItems.adjustmentId, id));

    if (data.items.length > 0) {
      updatedItems = await db
        .insert(adjustmentItems)
        .values(
          data.items.map((item) => ({
            adjustmentId: id,
            itemId: item.itemId,
            unitId: item.unitId ?? null,
            qtyChange: item.qtyChange ?? null,
            valueChange: item.valueChange ?? null,
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
    entityType: 'adjustment',
    entityId: id,
    oldData: old,
    newData: updated,
  });

  return { ...updated, items: updatedItems };
}

export async function approveAdjustment(
  tenantId: string,
  id: string,
  userId: string,
): Promise<AdjustmentWithItems | null> {
  const existing = await getAdjustment(tenantId, id);
  if (!existing) return null;

  if (existing.status !== 'draft') {
    throw new ApiError(400, 'Only draft adjustments can be approved', 'INVALID_STATE');
  }

  const result = await db
    .update(adjustments)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(
      and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId), isNull(adjustments.deletedAt)),
    )
    .returning();

  if (result.length === 0) return null;

  const updated = result[0];

  await inngest.send({
    name: 'adjustment/approved',
    data: { adjustmentId: id, tenantId },
  });

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'status_change',
    entityType: 'adjustment',
    entityId: id,
    oldData: { status: existing.status },
    newData: { status: 'approved' },
  });

  return { ...updated, items: existing.items };
}

export async function softDeleteAdjustment(
  tenantId: string,
  id: string,
  userId: string,
): Promise<AdjustmentRow | null> {
  const existing = await getAdjustment(tenantId, id);
  if (!existing) return null;

  if (existing.status !== 'draft') {
    throw new ApiError(400, 'Only draft adjustments can be deleted', 'INVALID_STATE');
  }

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(adjustments, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'adjustment',
    entityId: id,
    oldData: existing,
  });

  return existing;
}
