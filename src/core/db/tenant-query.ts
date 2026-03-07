import { createAdminClient } from '@/lib/supabase/admin';

export function createTenantClient(schemaName: string) {
  return createAdminClient(schemaName);
}

export async function getNextSequenceNumber(
  schemaName: string,
  sequenceId: string
): Promise<string> {
  const client = createAdminClient();
  const { data, error } = await client.rpc('exec_sql', {
    query: `
      UPDATE "${schemaName}".sequence_counters
      SET current_value = current_value + 1
      WHERE id = '${sequenceId}'
      RETURNING prefix || '-' || LPAD(current_value::TEXT, 6, '0') AS formatted_number;
    `
  });
  if (error) throw new Error(`Sequence error: ${error.message}`);
  return data?.[0]?.formatted_number;
}
