import { createAdminClient } from '@/lib/supabase/admin';

export async function receiveDispatch(
  schemaName: string,
  dispatchId: string,
  items: Array<{ id: string; received_quantity: number; received_bags?: number }>,
  userId: string
) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('receive_dispatch_txn', {
    p_schema: schemaName,
    p_dispatch_id: dispatchId,
    p_items: items,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to receive dispatch: ${error.message}`);
  return data;
}
