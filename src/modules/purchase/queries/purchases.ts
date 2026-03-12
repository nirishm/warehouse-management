import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { purchases, purchaseItems, auditLog } from '@/core/db/schema';
import { getNextSequence } from '@/modules/inventory/queries/sequence';
import { ApiError } from '@/core/api/error-handler';
import { inngest } from '@/inngest/client';
import type { CreatePurchaseInput, UpdatePurchaseInput } from '../validations/purchase';

type PurchaseRow = typeof purchases.$inferSelect;
type PurchaseItemRow = typeof purchaseItems.$inferSelect;

type PurchaseWithItems = PurchaseRow & { items: PurchaseItemRow[] };

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['ordered', 'cancelled'],
  ordered: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

export async function listPurchases(
  tenantId: string,
  filters?: {
    search?: string;
    status?: string;
    contactId?: string;
  },
  pagination?: { limit: number; offset: number },
) {
  const conditions = [eq(purchases.tenantId, tenantId), isNull(purchases.deletedAt)];

  if (filters?.search) {
    conditions.push(ilike(purchases.purchaseNumber, `%${filters.search}%`));
  }
  if (filters?.status) {
    conditions.push(
      eq(purchases.status, filters.status as 'draft' | 'ordered' | 'received' | 'cancelled'),
    );
  }
  if (filters?.contactId) {
    conditions.push(eq(purchases.contactId, filters.contactId));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(purchases)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(sql`${purchases.createdAt} desc`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(purchases)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getPurchase(tenantId: string, id: string): Promise<PurchaseWithItems | null> {
  const result = await db
    .select()
    .from(purchases)
    .where(
      and(eq(purchases.id, id), eq(purchases.tenantId, tenantId), isNull(purchases.deletedAt)),
    );

  if (!result[0]) return null;

  const items = await db
    .select()
    .from(purchaseItems)
    .where(eq(purchaseItems.purchaseId, id));

  return { ...result[0], items };
}

export async function createPurchase(
  tenantId: string,
  data: CreatePurchaseInput,
  userId: string,
): Promise<PurchaseWithItems> {
  const purchaseNumber = await getNextSequence(tenantId, 'PUR', 'PUR');

  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(purchases, {
    purchaseNumber,
    contactId: data.contactId ?? null,
    locationId: data.locationId ?? null,
    status: data.status ?? 'draft',
    expectedDeliveryDate: data.expectedDeliveryDate
      ? new Date(data.expectedDeliveryDate)
      : null,
    notes: data.notes ?? null,
    customFields: data.customFields ?? null,
    updatedAt: new Date(),
  });

  const purchase = inserted[0] as PurchaseRow;

  // Insert line items
  const insertedItems = await db
    .insert(purchaseItems)
    .values(
      data.items.map((item) => ({
        purchaseId: purchase.id,
        itemId: item.itemId,
        unitId: item.unitId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    )
    .returning();

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'purchase',
    entityId: purchase.id,
    newData: purchase,
  });

  return { ...purchase, items: insertedItems };
}

export async function updatePurchase(
  tenantId: string,
  id: string,
  data: UpdatePurchaseInput,
  userId: string,
): Promise<PurchaseWithItems | null> {
  const old = await getPurchase(tenantId, id);
  if (!old) return null;

  if (old.status !== 'draft') {
    throw new ApiError(400, 'Only draft purchases can be updated', 'INVALID_STATE');
  }

  const result = await db
    .update(purchases)
    .set({
      ...(data.contactId !== undefined && { contactId: data.contactId }),
      ...(data.locationId !== undefined && { locationId: data.locationId }),
      ...(data.expectedDeliveryDate !== undefined && {
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.customFields !== undefined && { customFields: data.customFields }),
      updatedAt: new Date(),
    })
    .where(
      and(eq(purchases.id, id), eq(purchases.tenantId, tenantId), isNull(purchases.deletedAt)),
    )
    .returning();

  if (result.length === 0) return null;

  const updated = result[0];
  let updatedItems: PurchaseItemRow[] = old.items;

  if (data.items !== undefined) {
    // Delete existing items and re-insert
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));

    if (data.items.length > 0) {
      updatedItems = await db
        .insert(purchaseItems)
        .values(
          data.items.map((item) => ({
            purchaseId: id,
            itemId: item.itemId,
            unitId: item.unitId ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
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
    entityType: 'purchase',
    entityId: id,
    oldData: old,
    newData: updated,
  });

  return { ...updated, items: updatedItems };
}

export async function updatePurchaseStatus(
  tenantId: string,
  id: string,
  status: 'draft' | 'ordered' | 'received' | 'cancelled',
  userId: string,
): Promise<PurchaseWithItems | null> {
  const existing = await getPurchase(tenantId, id);
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
    .update(purchases)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(purchases.id, id), eq(purchases.tenantId, tenantId), isNull(purchases.deletedAt)),
    )
    .returning();

  if (result.length === 0) return null;

  const updated = result[0];

  if (status === 'received') {
    await inngest.send({
      name: 'purchase/received',
      data: { purchaseId: id, tenantId },
    });
  }

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'status_change',
    entityType: 'purchase',
    entityId: id,
    oldData: { status: existing.status },
    newData: { status },
  });

  return { ...updated, items: existing.items };
}

export async function softDeletePurchase(
  tenantId: string,
  id: string,
  userId: string,
): Promise<PurchaseRow | null> {
  const existing = await getPurchase(tenantId, id);
  if (!existing) return null;

  if (existing.status !== 'draft') {
    throw new ApiError(400, 'Only draft purchases can be deleted', 'INVALID_STATE');
  }

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(purchases, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'purchase',
    entityId: id,
    oldData: existing,
  });

  return existing;
}
