import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaginationParams, applyPagination, PaginatedResponse, paginatedResult } from '@/lib/pagination';
import { applyLocationFilter } from '@/core/db/query-helpers';
import type { CreateReturnInput, Return, ReturnWithItems } from '../validations/return';

export async function listReturns(
  schemaName: string,
  options?: { allowedLocationIds?: string[] | null; pagination?: PaginationParams }
): Promise<PaginatedResponse<ReturnWithItems>> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('returns')
    .select(
      `*, location:locations(id,name,code), contact:contacts(id,name),
       items:return_items(*, commodity:commodities(id,name,code), unit:units(id,name,abbreviation))`,
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('return_date', { ascending: false });

  query = applyLocationFilter(query, 'location_id', options?.allowedLocationIds ?? null);

  if (options?.pagination) {
    query = applyPagination(query, options.pagination);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list returns: ${error.message}`);

  const pagination = options?.pagination ?? { page: 1, pageSize: count ?? 0 };
  return paginatedResult((data ?? []) as unknown as ReturnWithItems[], count ?? 0, pagination);
}

export async function getReturn(
  schemaName: string,
  id: string
): Promise<ReturnWithItems | null> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('returns')
    .select(
      `*, location:locations(id,name,code), contact:contacts(id,name),
       items:return_items(*, commodity:commodities(id,name,code), unit:units(id,name,abbreviation))`
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) return null;
  return data as unknown as ReturnWithItems;
}

/**
 * Validates that return item quantities don't exceed original transaction quantities.
 * Fetches the original purchase/sale items and compares per-commodity totals,
 * accounting for any previously confirmed returns on the same transaction.
 */
async function validateReturnQuantities(
  schemaName: string,
  input: CreateReturnInput
): Promise<void> {
  const client = createTenantClient(schemaName);

  // Fetch original transaction items
  const itemsTable = input.return_type === 'purchase_return' ? 'purchase_items' : 'sale_items';
  const fkColumn = input.return_type === 'purchase_return' ? 'purchase_id' : 'sale_id';

  const { data: originalItems, error: origErr } = await client
    .from(itemsTable)
    .select('commodity_id, unit_id, quantity')
    .eq(fkColumn, input.original_txn_id);

  if (origErr) throw new Error(`Failed to fetch original transaction: ${origErr.message}`);
  if (!originalItems || originalItems.length === 0) {
    throw new Error('Original transaction not found or has no items');
  }

  // Build map of original quantities keyed by commodity_id+unit_id
  // For dispatch items, the quantity field is 'sent_quantity', but purchase/sale use 'quantity'
  const originalQtyMap = new Map<string, number>();
  for (const item of originalItems) {
    const key = `${item.commodity_id}:${item.unit_id}`;
    originalQtyMap.set(key, (originalQtyMap.get(key) ?? 0) + Number(item.quantity));
  }

  // Fetch previously confirmed returns on the same transaction (excluding cancelled)
  const { data: priorReturns } = await client
    .from('returns')
    .select('id')
    .eq('original_txn_id', input.original_txn_id)
    .eq('return_type', input.return_type)
    .in('status', ['draft', 'confirmed'])
    .is('deleted_at', null);

  const priorReturnIds = (priorReturns ?? []).map((r) => r.id);

  const priorQtyMap = new Map<string, number>();
  if (priorReturnIds.length > 0) {
    const { data: priorItems } = await client
      .from('return_items')
      .select('commodity_id, unit_id, quantity')
      .in('return_id', priorReturnIds);

    for (const item of priorItems ?? []) {
      const key = `${item.commodity_id}:${item.unit_id}`;
      priorQtyMap.set(key, (priorQtyMap.get(key) ?? 0) + Number(item.quantity));
    }
  }

  // Validate each return item
  for (const item of input.items) {
    const key = `${item.commodity_id}:${item.unit_id}`;
    const originalQty = originalQtyMap.get(key);

    if (originalQty === undefined) {
      throw new Error(
        `Item ${item.commodity_id} with unit ${item.unit_id} not found in original transaction`
      );
    }

    const priorReturned = priorQtyMap.get(key) ?? 0;
    const remaining = originalQty - priorReturned;

    if (item.quantity > remaining) {
      throw new Error(
        `Return quantity ${item.quantity} exceeds remaining returnable quantity ${remaining} for item ${item.commodity_id}`
      );
    }
  }
}

export async function createReturn(
  schemaName: string,
  input: CreateReturnInput,
  userId: string
): Promise<Return> {
  // Keep this validation — it's read-only, stays in TS
  await validateReturnQuantities(schemaName, input);

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('create_return_txn', {
    p_schema: schemaName,
    p_input: input,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to create return: ${error.message}`);
  return data as Return;
}

export async function confirmReturn(
  schemaName: string,
  id: string
): Promise<Return> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('returns')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to confirm return: ${error.message}`);
  // Stock adjustment happens automatically via the stock_levels VIEW:
  // confirmed returns are included in the inbound/outbound CTEs
  return data as Return;
}

export async function cancelReturn(
  schemaName: string,
  id: string
): Promise<Return> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('returns')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to cancel return: ${error.message}`);
  return data as Return;
}
