import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { sales, saleItems, auditLog } from '@/core/db/schema';
import { getNextSequence } from '@/modules/inventory/queries/sequence';
import { inngest } from '@/inngest/client';
import type { CreateSaleInput, UpdateSaleInput } from '../validations/sale';
import { ApiError } from '@/core/api/error-handler';

type SaleRow = typeof sales.$inferSelect;

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['dispatched', 'cancelled'],
  dispatched: [],
  cancelled: [],
};

export async function listSales(
  tenantId: string,
  filters?: {
    search?: string;
    status?: string;
    contactId?: string;
  },
  pagination?: { limit: number; offset: number },
) {
  const conditions = [eq(sales.tenantId, tenantId), isNull(sales.deletedAt)];

  if (filters?.search) {
    conditions.push(ilike(sales.saleNumber, `%${filters.search}%`));
  }
  if (filters?.status) {
    conditions.push(
      eq(sales.status, filters.status as 'draft' | 'confirmed' | 'dispatched' | 'cancelled'),
    );
  }
  if (filters?.contactId) {
    conditions.push(eq(sales.contactId, filters.contactId));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(sales)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(sales.createdAt),
    db
      .select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getSale(tenantId: string, id: string) {
  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, id), eq(sales.tenantId, tenantId), isNull(sales.deletedAt)));

  if (!sale[0]) return null;

  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  return { ...sale[0], items };
}

export async function createSale(
  tenantId: string,
  data: CreateSaleInput,
  userId: string,
) {
  const saleNumber = await getNextSequence(tenantId, 'SAL', 'SAL');

  const { items: lineItems, ...saleData } = data;

  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(sales, {
    ...saleData,
    saleNumber,
    updatedAt: new Date(),
  });
  const row = inserted[0] as SaleRow;

  if (lineItems && lineItems.length > 0) {
    await db.insert(saleItems).values(
      lineItems.map((item) => ({
        saleId: row.id,
        itemId: item.itemId,
        unitId: item.unitId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    );
  }

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'sale',
    entityId: row.id,
    newData: row,
  });

  const createdItems = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, row.id));

  return { ...row, items: createdItems };
}

export async function updateSale(
  tenantId: string,
  id: string,
  data: UpdateSaleInput,
  userId: string,
) {
  const old = await getSale(tenantId, id);
  if (!old) return null;

  if (old.status !== 'draft') {
    throw new ApiError(400, 'Only draft sales can be updated', 'INVALID_STATUS');
  }

  const { items: lineItems, ...saleData } = data;

  const result = await db
    .update(sales)
    .set({ ...saleData, updatedAt: new Date() })
    .where(and(eq(sales.id, id), eq(sales.tenantId, tenantId), isNull(sales.deletedAt)))
    .returning();

  if (result.length === 0) return null;

  if (lineItems !== undefined) {
    await db.delete(saleItems).where(eq(saleItems.saleId, id));
    if (lineItems.length > 0) {
      await db.insert(saleItems).values(
        lineItems.map((item) => ({
          saleId: id,
          itemId: item.itemId,
          unitId: item.unitId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );
    }
  }

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'update',
    entityType: 'sale',
    entityId: id,
    oldData: old,
    newData: result[0],
  });

  const updatedItems = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, id));

  return { ...result[0], items: updatedItems };
}

export async function updateSaleStatus(
  tenantId: string,
  id: string,
  status: 'draft' | 'confirmed' | 'dispatched' | 'cancelled',
  userId: string,
) {
  const existing = await getSale(tenantId, id);
  if (!existing) return null;

  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status transition: ${existing.status} → ${status}`,
      'INVALID_TRANSITION',
    );
  }

  const result = await db
    .update(sales)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(sales.id, id), eq(sales.tenantId, tenantId), isNull(sales.deletedAt)))
    .returning();

  if (result.length === 0) return null;

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'status_change',
    entityType: 'sale',
    entityId: id,
    oldData: { status: existing.status },
    newData: { status },
  });

  if (status === 'confirmed') {
    await inngest.send({ name: 'sale/confirmed', data: { saleId: id, tenantId } });
  }

  if (status === 'dispatched') {
    await inngest.send({ name: 'sale/dispatched', data: { saleId: id, tenantId } });
  }

  return { ...result[0], items: existing.items };
}

export async function softDeleteSale(
  tenantId: string,
  id: string,
  userId: string,
) {
  const old = await getSale(tenantId, id);
  if (!old) return null;

  if (old.status !== 'draft') {
    throw new ApiError(400, 'Only draft sales can be deleted', 'INVALID_STATUS');
  }

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(sales, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'sale',
    entityId: id,
    oldData: old,
  });

  return old;
}
