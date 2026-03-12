import { createTenantClient, getNextSequenceNumber } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSchemaName, validateUUID } from '@/core/db/validate-schema';
import type { CreatePaymentInput, Payment, TransactionBalance } from '../validations/payment';

export async function listPayments(schemaName: string): Promise<Payment[]> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('payments')
    .select('*')
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (error) throw new Error(`Failed to list payments: ${error.message}`);
  return (data ?? []) as Payment[];
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
  const client = createTenantClient(schemaName);
  const paymentNumber = await getNextSequenceNumber(schemaName, 'payment');

  const { data, error } = await client
    .from('payments')
    .insert({
      payment_number: paymentNumber,
      transaction_type: input.transaction_type,
      transaction_id: input.transaction_id,
      contact_id: input.contact_id ?? null,
      amount: input.amount,
      payment_date: input.payment_date ?? new Date().toISOString(),
      payment_method: input.payment_method,
      reference_number: input.reference_number ?? null,
      notes: input.notes ?? null,
      recorded_by: userId,
    })
    .select('*')
    .single();

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
