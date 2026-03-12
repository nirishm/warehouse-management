import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/db/tenant-query', () => ({
  createTenantClient: vi.fn(),
}));

import { withTenantContext, requirePermission, requireModule } from '@/core/auth/guards';
import { createTenantClient } from '@/core/db/tenant-query';
import { PermissionError, ModuleDisabledError } from '@/core/errors';
import { NextRequest, NextResponse } from 'next/server';

function makeRequest(headers: Record<string, string> = {}) {
  const defaults = {
    'x-tenant-id': 'tid',
    'x-tenant-schema': 'tenant_demo',
    'x-tenant-role': 'tenant_admin',
    'x-tenant-modules': '["dispatch","purchase"]',
    'x-user-id': 'uid',
    'x-user-email': 'u@test.com',
  };
  const merged = { ...defaults, ...headers };
  // Remove empty string values to simulate missing headers
  const h = new Headers();
  for (const [k, v] of Object.entries(merged)) {
    if (v) h.set(k, v);
  }
  return new NextRequest(new URL('/api/t/demo/dispatches', 'http://localhost:3000'), { headers: h });
}

describe('withTenantContext (header-trust)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when x-user-id header is missing', async () => {
    const req = makeRequest({ 'x-user-id': '' });
    const handler = vi.fn();
    const res = await withTenantContext(req, handler);
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('grants all permissions for tenant_admin', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { display_name: 'Admin' }, error: null }),
          }),
        }),
      }),
    };
    vi.mocked(createTenantClient).mockReturnValue(mockClient as any);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    await withTenantContext(makeRequest(), handler);

    expect(handler).toHaveBeenCalledTimes(1);
    const ctx = handler.mock.calls[0][0];
    expect(ctx.userId).toBe('uid');
    expect(ctx.role).toBe('tenant_admin');
    expect(ctx.allowedLocationIds).toBeNull();
    expect(ctx.permissions.canDispatch).toBe(true);
    expect(ctx.permissions.canManageAdjustments).toBe(true);
  });

  it('fetches permissions and locations for non-admin roles', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { permissions: { canDispatch: true, canPurchase: false }, display_name: 'Staff' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'user_locations') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ location_id: 'loc1' }, { location_id: 'loc2' }],
              error: null,
            }),
          }),
        };
      }
    });
    vi.mocked(createTenantClient).mockReturnValue({ from: mockFrom } as any);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    await withTenantContext(makeRequest({ 'x-tenant-role': 'employee' }), handler);

    const ctx = handler.mock.calls[0][0];
    expect(ctx.role).toBe('employee');
    expect(ctx.allowedLocationIds).toEqual(['loc1', 'loc2']);
    expect(ctx.permissions.canDispatch).toBe(true);
    expect(ctx.permissions.canPurchase).toBe(false);
  });
});

describe('requirePermission', () => {
  it('throws PermissionError for missing permission', () => {
    const ctx = { role: 'employee', permissions: { canDispatch: false } } as any;
    expect(() => requirePermission(ctx, 'canDispatch')).toThrow(PermissionError);
  });

  it('does not throw for tenant_admin', () => {
    const ctx = { role: 'tenant_admin', permissions: {} } as any;
    expect(() => requirePermission(ctx, 'canDispatch')).not.toThrow();
  });
});

describe('requireModule', () => {
  it('throws ModuleDisabledError for missing module', () => {
    const ctx = { enabledModules: ['dispatch'] } as any;
    expect(() => requireModule(ctx, 'returns')).toThrow(ModuleDisabledError);
  });

  it('does not throw for enabled module', () => {
    const ctx = { enabledModules: ['dispatch', 'returns'] } as any;
    expect(() => requireModule(ctx, 'returns')).not.toThrow();
  });
});
