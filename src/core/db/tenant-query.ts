import { createAdminClient } from '@/lib/supabase/admin';

export function createTenantClient(schemaName: string) {
  return createAdminClient(schemaName);
}

export async function getNextSequenceNumber(
  schemaName: string,
  sequenceId: string
): Promise<string> {
  const client = createAdminClient();
  const { data, error } = await client.rpc('get_next_sequence', {
    p_schema: schemaName,
    p_seq_id: sequenceId,
  });
  if (error) throw new Error(`Sequence error: ${error.message}`);
  return data as string;
}
