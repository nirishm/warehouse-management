import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { contacts, auditLog } from '@/core/db/schema';
import type { CreateContactInput, UpdateContactInput } from '../validations/contact';

type ContactRow = typeof contacts.$inferSelect;

export async function listContacts(
  tenantId: string,
  filters?: {
    search?: string;
    type?: string;
    isActive?: boolean;
  },
  pagination?: { limit: number; offset: number },
) {
  const conditions = [eq(contacts.tenantId, tenantId), isNull(contacts.deletedAt)];

  if (filters?.search) {
    conditions.push(ilike(contacts.name, `%${filters.search}%`));
  }
  if (filters?.type) {
    conditions.push(
      eq(contacts.type, filters.type as 'supplier' | 'customer' | 'both'),
    );
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(contacts.isActive, filters.isActive));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(contacts.name),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getContact(tenantId: string, id: string) {
  const result = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.tenantId, tenantId),
        isNull(contacts.deletedAt),
      ),
    );
  return result[0] ?? null;
}

export async function createContact(
  tenantId: string,
  data: CreateContactInput,
  userId: string,
) {
  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(contacts, {
    ...data,
    updatedAt: new Date(),
  });
  const row = inserted[0] as ContactRow;

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'contact',
    entityId: row.id,
    newData: row,
  });

  return row;
}

export async function updateContact(
  tenantId: string,
  id: string,
  data: UpdateContactInput,
  userId: string,
) {
  const old = await getContact(tenantId, id);
  if (!old) return null;

  const result = await db
    .update(contacts)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.tenantId, tenantId),
        isNull(contacts.deletedAt),
      ),
    )
    .returning();

  if (result.length > 0) {
    await db.insert(auditLog).values({
      tenantId,
      userId,
      action: 'update',
      entityType: 'contact',
      entityId: id,
      oldData: old,
      newData: result[0],
    });
  }

  return result[0] ?? null;
}

export async function softDeleteContact(
  tenantId: string,
  id: string,
  userId: string,
) {
  const old = await getContact(tenantId, id);
  if (!old) return null;

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(contacts, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'contact',
    entityId: id,
    oldData: old,
  });

  return old;
}
