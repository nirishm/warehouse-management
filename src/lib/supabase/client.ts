import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _browserClient: ReturnType<typeof createSupabaseBrowserClient<any>> | null = null;

export function createBrowserClient() {
  if (!_browserClient) {
    _browserClient = createSupabaseBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
    );
  }
  return _browserClient;
}
