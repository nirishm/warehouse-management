import { eq, and, isNull } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import type { Database } from './drizzle';

/**
 * A tenant-scoped table must have `tenantId` and optionally `deletedAt` columns.
 */
type TenantScopedTable = PgTable & {
  tenantId: PgColumn;
  deletedAt?: PgColumn;
};

type TenantScopedTableWithDelete = PgTable & {
  tenantId: PgColumn;
  deletedAt: PgColumn;
  id: PgColumn;
};

type InferInsert<T extends PgTable> = T['$inferInsert'];

/**
 * withTenantScope — wraps db operations to automatically inject and filter by tenantId.
 *
 * Usage:
 *   const scope = withTenantScope(db, tenantId);
 *
 *   // Query all active rows
 *   const rows = await scope.query(items);
 *
 *   // Insert with auto-injected tenantId
 *   const [row] = await scope.insert(items, { name: 'Widget', ... });
 *
 *   // Update (set values + optional extra where condition)
 *   await scope.update(items, { name: 'Updated' });
 *   await scope.update(items, { name: 'Updated' }, eq(items.id, someId));
 *
 *   // Soft-delete
 *   await scope.softDelete(items, id);
 */
export function withTenantScope(db: Database, tenantId: string) {
  return {
    /**
     * Select all non-deleted rows for this tenant.
     */
    query<T extends TenantScopedTable>(table: T) {
      const base = db.select().from(table as PgTable);
      const conditions = [eq(table.tenantId, tenantId)];
      if ('deletedAt' in table && table.deletedAt) {
        conditions.push(isNull(table.deletedAt));
      }
      return base.where(and(...conditions));
    },

    /**
     * Insert a row, automatically injecting tenantId.
     * Returns the inserted row(s) via .returning().
     */
    insert<T extends TenantScopedTable>(
      table: T,
      data: Omit<InferInsert<T>, 'tenantId'>,
    ) {
      return db
        .insert(table as PgTable)
        .values({ ...data, tenantId } as InferInsert<T>)
        .returning();
    },

    /**
     * Update rows scoped to this tenant, with optional extra where condition.
     * Automatically excludes soft-deleted rows if the table has deletedAt.
     *
     * @param table  — the Drizzle table
     * @param values — partial record of columns to set
     * @param extraWhere — optional additional SQL condition (e.g. eq(table.id, id))
     */
    update<T extends TenantScopedTable>(
      table: T,
      values: Partial<InferInsert<T>>,
      extraWhere?: ReturnType<typeof and>,
    ) {
      const conditions = [eq(table.tenantId, tenantId)];
      if ('deletedAt' in table && table.deletedAt) {
        conditions.push(isNull(table.deletedAt));
      }
      if (extraWhere) {
        conditions.push(extraWhere);
      }
      return db
        .update(table as PgTable)
        .set(values as Record<string, unknown>)
        .where(and(...conditions));
    },

    /**
     * Soft-delete a row by setting deleted_at = now(), scoped to this tenant.
     */
    softDelete<T extends TenantScopedTableWithDelete>(table: T, id: string) {
      return db
        .update(table as PgTable)
        .set({ deletedAt: new Date() } as Partial<InferInsert<T>>)
        .where(
          and(
            eq(table.id, id),
            eq(table.tenantId, tenantId),
            isNull(table.deletedAt),
          ),
        );
    },
  };
}
