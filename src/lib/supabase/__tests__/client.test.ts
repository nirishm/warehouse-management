import { describe, it, expect, vi } from 'vitest';

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

describe('Supabase clients', () => {
  it('createBrowserClient returns a client', async () => {
    const { createBrowserClient } = await import('../client');
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
