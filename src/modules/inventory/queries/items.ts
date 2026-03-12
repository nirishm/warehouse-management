import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { items, auditLog } from '@/core/db/schema';
import { getNextSequence } from './sequence';
import type { CreateItemInput, UpdateItemInput } from '../validations/item';

type ItemRow = typeof items.$inferSelect;

export async function listItems(
  tenantId: string,
  filters?: {
    search?: string;
    category?: string;
    type?: string;
    isActive?: boolean;
  },
  pagination?: { limit: number; offset: number },
) {
  const conditions = [eq(items.tenantId, tenantId), isNull(items.deletedAt)];

  if (filters?.search) {
    conditions.push(ilike(items.name, `%${filters.search}%`));
  }
  if (filters?.category) {
    conditions.push(eq(items.category, filters.category));
  }
  if (filters?.type) {
    conditions.push(
      eq(items.type, filters.type as 'goods' | 'service' | 'composite'),
    );
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(items.isActive, filters.isActive));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(items)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(items.createdAt),
    db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getItem(tenantId: string, id: string) {
  const result = await db
    .select()
    .from(items)
    .where(
      and(eq(items.id, id), eq(items.tenantId, tenantId), isNull(items.deletedAt)),
    );
  return result[0] ?? null;
}

export async function createItem(
  tenantId: string,
  data: CreateItemInput,
  userId: string,
) {
  // Auto-generate code if not provided
  const code = data.code ?? (await getNextSequence(tenantId, 'ITM', 'ITM'));

  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(items, {
    ...data,
    code,
    updatedAt: new Date(),
  });
  const row = inserted[0] as ItemRow;

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'item',
    entityId: row.id,
    newData: row,
  });

  return row;
}

export async function updateItem(
  tenantId: string,
  id: string,
  data: UpdateItemInput,
  userId: string,
) {
  const old = await getItem(tenantId, id);
  if (!old) return null;

  const result = await db
    .update(items)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(items.id, id), eq(items.tenantId, tenantId), isNull(items.deletedAt)),
    )
    .returning();

  if (result.length > 0) {
    await db.insert(auditLog).values({
      tenantId,
      userId,
      action: 'update',
      entityType: 'item',
      entityId: id,
      oldData: old,
      newData: result[0],
    });
  }

  return result[0] ?? null;
}

export async function softDeleteItem(
  tenantId: string,
  id: string,
  userId: string,
) {
  const old = await getItem(tenantId, id);
  if (!old) return null;

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(items, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'item',
    entityId: id,
    oldData: old,
  });

  return old;
}
