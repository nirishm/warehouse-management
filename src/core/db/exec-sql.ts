import { createAdminClient } from '@/lib/supabase/admin';

export async function execSql<T = Record<string, unknown>>(
  query: string,
  params?: unknown[]
): Promise<T[]> {
  const client = createAdminClient();
  const { data, error } = await client.rpc('exec_sql', {
    query,
    ...(params && params.length > 0 ? { params } : {}),
  });
  if (error) throw new Error(`SQL execution failed: ${error.message}`);
  return (data ?? []) as T[];
}
