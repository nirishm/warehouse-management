// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _clients = new Map<string, SupabaseClient<any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(schema?: string): SupabaseClient<any> {
  const key = schema ?? '__default__';
  let client = _clients.get(key);
  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      schema ? { db: { schema } } : undefined
    ) as SupabaseClient<any>;
    _clients.set(key, client);
  }
  return client;
}
