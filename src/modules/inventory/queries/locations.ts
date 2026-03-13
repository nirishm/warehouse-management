import { eq, and, ilike, isNull, sql, inArray } from 'drizzle-orm';
import type { LocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { locations, auditLog } from '@/core/db/schema';
import type { CreateLocationInput, UpdateLocationInput } from '../validations/location';

type LocationRow = typeof locations.$inferSelect;

export async function listLocations(
  tenantId: string,
  filters?: {
    search?: string;
    type?: string;
    isActive?: boolean;
    locationScope?: LocationScope;
  },
  pagination?: { limit: number; offset: number },
) {
  if (filters?.locationScope !== undefined && filters.locationScope !== null
      && filters.locationScope.length === 0) {
    return { data: [], total: 0 };
  }

  const conditions = [eq(locations.tenantId, tenantId), isNull(locations.deletedAt)];

  if (filters?.search) {
    conditions.push(ilike(locations.name, `%${filters.search}%`));
  }
  if (filters?.type) {
    conditions.push(
      eq(locations.type, filters.type as 'warehouse' | 'store' | 'yard' | 'external'),
    );
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(locations.isActive, filters.isActive));
  }
  if (filters?.locationScope && filters.locationScope.length > 0) {
    conditions.push(inArray(locations.id, filters.locationScope));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(locations)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(locations.createdAt),
    db
      .select({ count: sql<number>`count(*)` })
      .from(locations)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getLocation(tenantId: string, id: string) {
  const result = await db
    .select()
    .from(locations)
    .where(
      and(
        eq(locations.id, id),
        eq(locations.tenantId, tenantId),
        isNull(locations.deletedAt),
      ),
    );
  return result[0] ?? null;
}

export async function createLocation(
  tenantId: string,
  data: CreateLocationInput,
  userId: string,
) {
  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(locations, {
    ...data,
    updatedAt: new Date(),
  });
  const row = inserted[0] as LocationRow;

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'location',
    entityId: row.id,
    newData: row,
  });

  return row;
}

export async function updateLocation(
  tenantId: string,
  id: string,
  data: UpdateLocationInput,
  userId: string,
) {
  const old = await getLocation(tenantId, id);
  if (!old) return null;

  const result = await db
    .update(locations)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(locations.id, id),
        eq(locations.tenantId, tenantId),
        isNull(locations.deletedAt),
      ),
    )
    .returning();

  if (result.length > 0) {
    await db.insert(auditLog).values({
      tenantId,
      userId,
      action: 'update',
      entityType: 'location',
      entityId: id,
      oldData: old,
      newData: result[0],
    });
  }

  return result[0] ?? null;
}

export async function softDeleteLocation(
  tenantId: string,
  id: string,
  userId: string,
) {
  const old = await getLocation(tenantId, id);
  if (!old) return null;

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(locations, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'location',
    entityId: id,
    oldData: old,
  });

  return old;
}
