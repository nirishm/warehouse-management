import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { auditLog } from '@/core/db/schema';
import type { PaginationParams } from '@/lib/pagination';

export interface AuditFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listAuditEntries(
  tenantId: string,
  filters?: AuditFilters,
  pagination?: Pick<PaginationParams, 'limit' | 'offset'>,
) {
  const conditions = [eq(auditLog.tenantId, tenantId)];

  if (filters?.entityType) {
    conditions.push(eq(auditLog.entityType, filters.entityType));
  }
  if (filters?.entityId) {
    conditions.push(eq(auditLog.entityId, filters.entityId));
  }
  if (filters?.userId) {
    conditions.push(eq(auditLog.userId, filters.userId));
  }
  if (filters?.action) {
    conditions.push(
      eq(
        auditLog.action,
        filters.action as 'create' | 'update' | 'delete' | 'status_change',
      ),
    );
  }
  if (filters?.dateFrom) {
    conditions.push(sql`${auditLog.createdAt} >= ${new Date(filters.dateFrom)}`);
  }
  if (filters?.dateTo) {
    conditions.push(sql`${auditLog.createdAt} <= ${new Date(filters.dateTo)}`);
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(sql`${auditLog.createdAt} desc`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}
