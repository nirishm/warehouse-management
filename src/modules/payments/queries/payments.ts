import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSchemaName, validateUUID } from '@/core/db/validate-schema';
import type { CreatePaymentInput, Payment, TransactionBalance } from '../validations/payment';
import { PaginationParams, applyPagination, PaginatedResponse, paginatedResult } from '@/lib/pagination';

export async function listPayments(
  schemaName: string,
  options?: { pagination?: PaginationParams }
): Promise<PaginatedResponse<Payment>> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('payments')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (options?.pagination) {
    query = applyPagination(query, options.pagination);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list payments: ${error.message}`);
  return paginatedResult(
    (data ?? []) as Payment[],
    count ?? 0,
    options?.pagination ?? { page: 1, pageSize: 50 }
  );
}

export async function getPaymentsForTransaction(
  schemaName: string,
  transactionType: 'purchase' | 'sale',
  transactionId: string
): Promise<Payment[]> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('transaction_type', transactionType)
    .eq('transaction_id', transactionId)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (error) throw new Error(`Failed to get payments: ${error.message}`);
  return (data ?? []) as Payment[];
}

export async function createPayment(
  schemaName: string,
  input: CreatePaymentInput,
  userId: string
): Promise<Payment> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('create_payment_txn', {
    p_schema: schemaName,
    p_input: input,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to create payment: ${error.message}`);
  return data as Payment;
}

export async function voidPayment(schemaName: string, id: string): Promise<Payment> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('payments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to void payment: ${error.message}`);
  return data as Payment;
}

export async function getBalance(
  schemaName: string,
  transactionType: 'purchase' | 'sale',
  transactionId: string
): Promise<TransactionBalance> {
  validateSchemaName(schemaName);
  validateUUID(transactionId, 'transaction ID');
  if (transactionType !== 'purchase' && transactionType !== 'sale') {
    throw new Error('Invalid transaction type');
  }
  const adminClient = createAdminClient();

  // Compute total_value from items
  const itemsTable = transactionType === 'purchase' ? 'purchase_items' : 'sale_items';
  const fkColumn = transactionType === 'purchase' ? 'purchase_id' : 'sale_id';

  const { data: valueData, error: valueError } = await adminClient.rpc('exec_sql', {
    query: `
      SELECT COALESCE(SUM(quantity * COALESCE(unit_price, 0)), 0) AS total_value
      FROM "${schemaName}"."${itemsTable}"
      WHERE ${fkColumn} = '${transactionId}'
    `,
  });
  if (valueError) throw new Error(`Failed to compute total value: ${valueError.message}`);

  const totalValue = Number(valueData?.[0]?.total_value ?? 0);

  const payments = await getPaymentsForTransaction(schemaName, transactionType, transactionId);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    transaction_id: transactionId,
    transaction_type: transactionType,
    total_value: totalValue,
    total_paid: totalPaid,
    outstanding: totalValue - totalPaid,
  };
}
