import { createTenantClient } from '@/core/db/tenant-query';

export async function receiveDispatch(
  schemaName: string,
  dispatchId: string,
  items: Array<{ id: string; received_quantity: number; received_bags?: number }>,
  userId: string
) {
  const client = createTenantClient(schemaName);

  // Verify dispatch exists and is in a receivable state
  const { data: dispatch, error: fetchError } = await client
    .from('dispatches')
    .select('id, status')
    .eq('id', dispatchId)
    .is('deleted_at', null)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error('Dispatch not found');
    }
    throw new Error(`Failed to fetch dispatch: ${fetchError.message}`);
  }

  if (!dispatch) {
    throw new Error('Dispatch not found');
  }

  const receivableStatuses = ['dispatched', 'in_transit'];
  if (!receivableStatuses.includes(dispatch.status)) {
    throw new Error(
      `Dispatch cannot be received in status "${dispatch.status}". Must be "dispatched" or "in_transit".`
    );
  }

  // Verify all item IDs belong to this dispatch
  const { data: existingItems, error: itemsFetchError } = await client
    .from('dispatch_items')
    .select('id')
    .eq('dispatch_id', dispatchId);

  if (itemsFetchError) {
    throw new Error(`Failed to fetch dispatch items: ${itemsFetchError.message}`);
  }

  const existingItemIds = new Set((existingItems ?? []).map((i) => i.id));
  for (const item of items) {
    if (!existingItemIds.has(item.id)) {
      throw new Error(`Item "${item.id}" does not belong to this dispatch`);
    }
  }

  // Update each dispatch item with received quantities
  for (const item of items) {
    const updateData: Record<string, unknown> = {
      received_quantity: item.received_quantity,
    };
    if (item.received_bags !== undefined) {
      updateData.received_bags = item.received_bags;
    }

    const { error: updateError } = await client
      .from('dispatch_items')
      .update(updateData)
      .eq('id', item.id)
      .eq('dispatch_id', dispatchId);

    if (updateError) {
      throw new Error(`Failed to update item "${item.id}": ${updateError.message}`);
    }
  }

  // Update dispatch status to 'received'
  const { data: updatedDispatch, error: dispatchUpdateError } = await client
    .from('dispatches')
    .update({
      status: 'received',
      received_at: new Date().toISOString(),
      received_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dispatchId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (dispatchUpdateError) {
    throw new Error(`Failed to update dispatch status: ${dispatchUpdateError.message}`);
  }

  return updatedDispatch;
}
