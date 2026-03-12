import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { alertThresholds, auditLog } from '@/core/db/schema';
import type { PaginationParams } from '@/lib/pagination';
import type {
  CreateAlertThresholdInput,
  UpdateAlertThresholdInput,
} from '../validations/alert-threshold';

type AlertThresholdRow = typeof alertThresholds.$inferSelect;

export interface AlertThresholdFilters {
  itemId?: string;
  locationId?: string;
}

export async function listAlertThresholds(
  tenantId: string,
  filters?: AlertThresholdFilters,
  pagination?: Pick<PaginationParams, 'limit' | 'offset'>,
) {
  const conditions = [eq(alertThresholds.tenantId, tenantId)];

  if (filters?.itemId) {
    conditions.push(eq(alertThresholds.itemId, filters.itemId));
  }
  if (filters?.locationId) {
    conditions.push(eq(alertThresholds.locationId, filters.locationId));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(alertThresholds)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(sql`${alertThresholds.createdAt} desc`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(alertThresholds)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getAlertThreshold(
  tenantId: string,
  id: string,
): Promise<AlertThresholdRow | null> {
  const result = await db
    .select()
    .from(alertThresholds)
    .where(and(eq(alertThresholds.id, id), eq(alertThresholds.tenantId, tenantId)));

  return result[0] ?? null;
}

export async function createAlertThreshold(
  tenantId: string,
  data: CreateAlertThresholdInput,
  userId: string,
): Promise<AlertThresholdRow> {
  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(alertThresholds, {
    itemId: data.itemId,
    locationId: data.locationId ?? null,
    minQuantity: String(data.minQuantity),
    updatedAt: new Date(),
  });

  const threshold = inserted[0] as AlertThresholdRow;

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'alert_threshold',
    entityId: threshold.id,
    newData: threshold,
  });

  return threshold;
}

export async function updateAlertThreshold(
  tenantId: string,
  id: string,
  data: UpdateAlertThresholdInput,
  userId: string,
): Promise<AlertThresholdRow | null> {
  const existing = await getAlertThreshold(tenantId, id);
  if (!existing) return null;

  const result = await db
    .update(alertThresholds)
    .set({
      minQuantity: String(data.minQuantity),
      updatedAt: new Date(),
    })
    .where(and(eq(alertThresholds.id, id), eq(alertThresholds.tenantId, tenantId)))
    .returning();

  if (result.length === 0) return null;

  const updated = result[0];

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'update',
    entityType: 'alert_threshold',
    entityId: id,
    oldData: existing,
    newData: updated,
  });

  return updated;
}

export async function deleteAlertThreshold(
  tenantId: string,
  id: string,
  userId: string,
): Promise<AlertThresholdRow | null> {
  const existing = await getAlertThreshold(tenantId, id);
  if (!existing) return null;

  await db
    .delete(alertThresholds)
    .where(and(eq(alertThresholds.id, id), eq(alertThresholds.tenantId, tenantId)));

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'alert_threshold',
    entityId: id,
    oldData: existing,
  });

  return existing;
}
