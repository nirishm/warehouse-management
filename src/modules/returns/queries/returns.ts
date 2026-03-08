import { createTenantClient, getNextSequenceNumber } from '@/core/db/tenant-query';
import type { CreateReturnInput, Return, ReturnWithItems } from '../validations/return';

export async function listReturns(
  schemaName: string,
  options?: { allowedLocationIds?: string[] | null }
): Promise<ReturnWithItems[]> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('returns')
    .select(
      `*, location:locations(id,name,code), contact:contacts(id,name),
       items:return_items(*, commodity:commodities(id,name,code), unit:units(id,name,abbreviation))`
    )
    .is('deleted_at', null)
    .order('return_date', { ascending: false });

  const ids = options?.allowedLocationIds;
  if (ids !== null && ids !== undefined && ids.length > 0) {
    query = query.in('location_id', ids);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list returns: ${error.message}`);
  return (data ?? []) as unknown as ReturnWithItems[];
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
        `Commodity ${item.commodity_id} with unit ${item.unit_id} not found in original transaction`
      );
    }

    const priorReturned = priorQtyMap.get(key) ?? 0;
    const remaining = originalQty - priorReturned;

    if (item.quantity > remaining) {
      throw new Error(
        `Return quantity ${item.quantity} exceeds remaining returnable quantity ${remaining} for commodity ${item.commodity_id}`
      );
    }
  }
}

export async function createReturn(
  schemaName: string,
  input: CreateReturnInput,
  userId: string
): Promise<Return> {
  // Validate quantities against original transaction
  await validateReturnQuantities(schemaName, input);

  const client = createTenantClient(schemaName);
  const returnNumber = await getNextSequenceNumber(schemaName, 'return');

  const { data: ret, error: retErr } = await client
    .from('returns')
    .insert({
      return_number: returnNumber,
      return_type: input.return_type,
      original_txn_id: input.original_txn_id,
      location_id: input.location_id,
      contact_id: input.contact_id ?? null,
      return_date: input.return_date ?? new Date().toISOString(),
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      status: 'draft',
      created_by: userId,
    })
    .select('*')
    .single();

  if (retErr) throw new Error(`Failed to create return: ${retErr.message}`);

  const items = input.items.map((item) => ({
    return_id: ret.id,
    commodity_id: item.commodity_id,
    unit_id: item.unit_id,
    quantity: item.quantity,
    lot_id: item.lot_id ?? null,
    notes: item.notes ?? null,
  }));

  const { error: itemsErr } = await client.from('return_items').insert(items);
  if (itemsErr) throw new Error(`Failed to create return items: ${itemsErr.message}`);

  return ret as Return;
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
