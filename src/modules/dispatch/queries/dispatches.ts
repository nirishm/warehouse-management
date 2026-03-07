import { createTenantClient, getNextSequenceNumber } from '@/core/db/tenant-query';
import type {
  CreateDispatchInput,
  DispatchWithLocations,
  DispatchItemWithNames,
  Dispatch,
} from '../validations/dispatch';

export async function listDispatches(
  schemaName: string
): Promise<DispatchWithLocations[]> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('dispatches')
    .select(
      '*, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name), dispatch_items(id)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list dispatches: ${error.message}`);

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const items = row.dispatch_items as { id: string }[] | null;
    return {
      ...row,
      item_count: items?.length ?? 0,
    } as DispatchWithLocations;
  });
}

export async function getDispatchById(
  schemaName: string,
  id: string
): Promise<
  | (DispatchWithLocations & { dispatch_items: DispatchItemWithNames[] })
  | null
> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('dispatches')
    .select(
      '*, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name), dispatch_items(*, commodity:commodities(name, code), unit:units(name, abbreviation))'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get dispatch: ${error.message}`);
  }

  return data as DispatchWithLocations & {
    dispatch_items: DispatchItemWithNames[];
  };
}

export async function createDispatch(
  schemaName: string,
  input: CreateDispatchInput,
  userId: string
): Promise<Dispatch> {
  const client = createTenantClient(schemaName);

  const dispatchNumber = await getNextSequenceNumber(schemaName, 'dispatch');

  const { data: dispatch, error: dispatchError } = await client
    .from('dispatches')
    .insert({
      dispatch_number: dispatchNumber,
      origin_location_id: input.origin_location_id,
      dest_location_id: input.dest_location_id,
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
      dispatched_by: userId,
      transporter_name: input.transporter_name ?? null,
      vehicle_number: input.vehicle_number ?? null,
      driver_name: input.driver_name ?? null,
      driver_phone: input.driver_phone ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (dispatchError)
    throw new Error(`Failed to create dispatch: ${dispatchError.message}`);

  const items = input.items.map((item) => ({
    dispatch_id: dispatch.id,
    commodity_id: item.commodity_id,
    unit_id: item.unit_id,
    sent_quantity: item.sent_quantity,
    sent_bags: item.sent_bags ?? null,
  }));

  const { error: itemsError } = await client
    .from('dispatch_items')
    .insert(items);

  if (itemsError)
    throw new Error(`Failed to create dispatch items: ${itemsError.message}`);

  return dispatch as Dispatch;
}

export async function cancelDispatch(
  schemaName: string,
  id: string
): Promise<void> {
  const client = createTenantClient(schemaName);
  const { error } = await client
    .from('dispatches')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new Error(`Failed to cancel dispatch: ${error.message}`);
}
