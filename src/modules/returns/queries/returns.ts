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

export async function createReturn(
  schemaName: string,
  input: CreateReturnInput,
  userId: string
): Promise<Return> {
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
