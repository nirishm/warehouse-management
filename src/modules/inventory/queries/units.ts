import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { units, auditLog } from '@/core/db/schema';
import type { CreateUnitInput, UpdateUnitInput } from '../validations/unit';

type UnitRow = typeof units.$inferSelect;

export async function listUnits(
  tenantId: string,
  filters?: {
    search?: string;
    type?: string;
  },
  pagination?: { limit: number; offset: number },
) {
  const conditions = [eq(units.tenantId, tenantId), isNull(units.deletedAt)];

  if (filters?.search) {
    conditions.push(ilike(units.name, `%${filters.search}%`));
  }
  if (filters?.type) {
    conditions.push(
      eq(units.type, filters.type as 'weight' | 'volume' | 'length' | 'count' | 'area'),
    );
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(units)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(units.name),
    db
      .select({ count: sql<number>`count(*)` })
      .from(units)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getUnit(tenantId: string, id: string) {
  const result = await db
    .select()
    .from(units)
    .where(
      and(eq(units.id, id), eq(units.tenantId, tenantId), isNull(units.deletedAt)),
    );
  return result[0] ?? null;
}

export async function createUnit(
  tenantId: string,
  data: CreateUnitInput,
  userId: string,
) {
  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(units, {
    ...data,
    updatedAt: new Date(),
  });
  const row = inserted[0] as UnitRow;

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'unit',
    entityId: row.id,
    newData: row,
  });

  return row;
}

export async function updateUnit(
  tenantId: string,
  id: string,
  data: UpdateUnitInput,
  userId: string,
) {
  const old = await getUnit(tenantId, id);
  if (!old) return null;

  const result = await db
    .update(units)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(units.id, id), eq(units.tenantId, tenantId), isNull(units.deletedAt)),
    )
    .returning();

  if (result.length > 0) {
    await db.insert(auditLog).values({
      tenantId,
      userId,
      action: 'update',
      entityType: 'unit',
      entityId: id,
      oldData: old,
      newData: result[0],
    });
  }

  return result[0] ?? null;
}

export async function softDeleteUnit(
  tenantId: string,
  id: string,
  userId: string,
) {
  const old = await getUnit(tenantId, id);
  if (!old) return null;

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(units, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'unit',
    entityId: id,
    oldData: old,
  });

  return old;
}
