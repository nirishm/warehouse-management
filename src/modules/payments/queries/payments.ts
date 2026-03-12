import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { withTenantScope } from '@/core/db/tenant-scope';
import { payments, auditLog } from '@/core/db/schema';
import { getNextSequence } from '@/modules/inventory/queries/sequence';
import type { PaginationParams } from '@/lib/pagination';
import type { CreatePaymentInput } from '../validations/payment';

type PaymentRow = typeof payments.$inferSelect;

export interface PaymentFilters {
  type?: 'purchase' | 'sale';
  referenceId?: string;
}

export async function listPayments(
  tenantId: string,
  filters?: PaymentFilters,
  pagination?: Pick<PaginationParams, 'limit' | 'offset'>,
) {
  const conditions = [eq(payments.tenantId, tenantId), isNull(payments.deletedAt)];

  if (filters?.type) {
    conditions.push(eq(payments.type, filters.type));
  }
  if (filters?.referenceId) {
    conditions.push(eq(payments.referenceId, filters.referenceId));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(payments)
      .where(where)
      .limit(pagination?.limit ?? 20)
      .offset(pagination?.offset ?? 0)
      .orderBy(desc(payments.paymentDate)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(where),
  ]);

  return { data, total: Number(countResult[0]?.count ?? 0) };
}

export async function getPayment(tenantId: string, id: string): Promise<PaymentRow | null> {
  const result = await db
    .select()
    .from(payments)
    .where(
      and(eq(payments.id, id), eq(payments.tenantId, tenantId), isNull(payments.deletedAt)),
    );

  return result[0] ?? null;
}

export async function createPayment(
  tenantId: string,
  data: CreatePaymentInput,
  userId: string,
): Promise<PaymentRow> {
  const paymentNumber = await getNextSequence(tenantId, 'PAY', 'PAY');

  const scope = withTenantScope(db, tenantId);
  const inserted = await scope.insert(payments, {
    paymentNumber,
    type: data.type,
    referenceId: data.referenceId,
    amount: data.amount,
    paymentMethod: data.paymentMethod ?? null,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
    notes: data.notes ?? null,
    updatedAt: new Date(),
  });

  const payment = inserted[0] as PaymentRow;

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'create',
    entityType: 'payment',
    entityId: payment.id,
    newData: payment,
  });

  return payment;
}

export async function softDeletePayment(
  tenantId: string,
  id: string,
  userId: string,
): Promise<PaymentRow | null> {
  const existing = await getPayment(tenantId, id);
  if (!existing) return null;

  const scope = withTenantScope(db, tenantId);
  await scope.softDelete(payments, id);

  await db.insert(auditLog).values({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'payment',
    entityId: id,
    oldData: existing,
  });

  return existing;
}

export async function getPaymentSummary(
  tenantId: string,
  type: 'purchase' | 'sale',
  referenceId: string,
): Promise<{ totalPaid: number; paymentCount: number }> {
  const result = await db
    .select({
      totalPaid: sql<number>`coalesce(sum(${payments.amount}::numeric), 0)`,
      paymentCount: sql<number>`count(*)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        eq(payments.type, type),
        eq(payments.referenceId, referenceId),
        isNull(payments.deletedAt),
      ),
    );

  return {
    totalPaid: Number(result[0]?.totalPaid ?? 0),
    paymentCount: Number(result[0]?.paymentCount ?? 0),
  };
}
