import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { customFieldDefinitions, auditLog } from '@/core/db/schema';
import type {
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
} from '../validations/custom-field';

type CustomFieldRow = typeof customFieldDefinitions.$inferSelect;

export async function listCustomFields(
  tenantId: string,
  filters?: {
    entityType?: string;
  },
  pagination?: { limit: number; offset: number },
) {
  const conditions = [eq(customFieldDefinitions.tenantId, tenantId)];

  if (filters?.entityType) {
    conditions.push(
      eq(
        customFieldDefinitions.entityType,
        filters.entityType as 'item' | 'contact' | 'sale' | 'purchase' | 'transfer',
      ),
    );
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(customFieldDefinitions)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(customFieldDefinitions.sortOrder, customFieldDefinitions.createdAt),
    db
      .select({ count: sql<number>`count(*)` })
      .from(customFieldDefinitions)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getCustomField(tenantId: string, id: string) {
  const result = await db
    .select()
    .from(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.id, id),
        eq(customFieldDefinitions.tenantId, tenantId),
      ),
    );
  return result[0] ?? null;
}

export async function createCustomField(
  tenantId: string,
  data: CreateCustomFieldInput,
  userId: string,
) {
  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(customFieldDefinitions, {
    ...data,
    updatedAt: new Date(),
  });
  const row = inserted[0] as CustomFieldRow;

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'custom_field',
    entityId: row.id,
    newData: row,
  });

  return row;
}

export async function updateCustomField(
  tenantId: string,
  id: string,
  data: UpdateCustomFieldInput,
  userId: string,
) {
  const old = await getCustomField(tenantId, id);
  if (!old) return null;

  const result = await db
    .update(customFieldDefinitions)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(customFieldDefinitions.id, id),
        eq(customFieldDefinitions.tenantId, tenantId),
      ),
    )
    .returning();

  if (result.length > 0) {
    await db.insert(auditLog).values({
      tenantId,
      userId,
      action: 'update',
      entityType: 'custom_field',
      entityId: id,
      oldData: old,
      newData: result[0],
    });
  }

  return result[0] ?? null;
}

export async function hardDeleteCustomField(
  tenantId: string,
  id: string,
  userId: string,
) {
  const old = await getCustomField(tenantId, id);
  if (!old) return null;

  await db
    .delete(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.id, id),
        eq(customFieldDefinitions.tenantId, tenantId),
      ),
    );

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'custom_field',
    entityId: id,
    oldData: old,
  });

  return old;
}
