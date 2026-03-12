import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { withSuperAdmin } from '@/core/auth/admin-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';

function makeRequest(path = '/api/admin/tenants') {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

describe('withSuperAdmin', () => {
  it('returns 401 when no user session', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as any);

    const handler = vi.fn();
    const res = await withSuperAdmin(makeRequest(), handler);
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not super admin', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }) },
    } as any);
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    } as any);

    const handler = vi.fn();
    const res = await withSuperAdmin(makeRequest(), handler);
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler when user is super admin', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }) },
    } as any);
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { user_id: 'u1' }, error: null }),
          }),
        }),
      }),
    } as any);

    const handler = vi.fn().mockResolvedValue(new Response('ok'));
    await withSuperAdmin(makeRequest(), handler);
    expect(handler).toHaveBeenCalledWith({ userId: 'u1', userEmail: 'a@b.com' });
  });
});
