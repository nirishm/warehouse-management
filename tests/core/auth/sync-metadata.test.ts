import { describe, it, expect } from 'vitest';
import { buildAppMetadata } from '@/core/auth/sync-metadata';

describe('buildAppMetadata', () => {
  it('returns null when user has no tenant memberships', () => {
    const result = buildAppMetadata([], []);
    expect(result).toBeNull();
  });

  it('builds correct metadata for single tenant membership', () => {
    const memberships = [
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'admin' as const,
        isDefault: true,
      },
    ];
    const tenants = [
      {
        id: 'tenant-1',
        slug: 'acme',
        enabledModules: ['inventory', 'purchases'],
      },
    ];

    const result = buildAppMetadata(memberships, tenants);

    expect(result).toEqual({
      tenant_id: 'tenant-1',
      tenant_slug: 'acme',
      role: 'admin',
      enabled_modules: ['inventory', 'purchases'],
      is_super_admin: false,
      memberships: [
        { tenantId: 'tenant-1', slug: 'acme', role: 'admin' },
      ],
    });
  });

  it('uses first default membership as primary tenant', () => {
    const memberships = [
      { userId: 'user-1', tenantId: 't-1', role: 'viewer' as const, isDefault: false },
      { userId: 'user-1', tenantId: 't-2', role: 'admin' as const, isDefault: true },
    ];
    const tenants = [
      { id: 't-1', slug: 'org-a', enabledModules: ['inventory'] },
      { id: 't-2', slug: 'org-b', enabledModules: ['inventory', 'sales'] },
    ];

    const result = buildAppMetadata(memberships, tenants);

    expect(result?.tenant_id).toBe('t-2');
    expect(result?.tenant_slug).toBe('org-b');
    expect(result?.role).toBe('admin');
    expect(result?.memberships).toHaveLength(2);
  });

  it('falls back to first membership if none is default', () => {
    const memberships = [
      { userId: 'user-1', tenantId: 't-1', role: 'operator' as const, isDefault: false },
    ];
    const tenants = [
      { id: 't-1', slug: 'org-a', enabledModules: null },
    ];

    const result = buildAppMetadata(memberships, tenants);

    expect(result?.tenant_id).toBe('t-1');
    expect(result?.enabled_modules).toEqual([]);
  });

  it('returns minimal metadata with is_super_admin: true for super-admin with no memberships', () => {
    const result = buildAppMetadata([], [], true);
    expect(result).toEqual({
      tenant_id: '',
      tenant_slug: '',
      role: 'viewer',
      enabled_modules: [],
      is_super_admin: true,
      memberships: [],
    });
  });

  it('includes is_super_admin: true alongside tenant context for super-admin with memberships', () => {
    const memberships = [
      {
        userId: 'sa-1',
        tenantId: 'tenant-1',
        role: 'owner' as const,
        isDefault: true,
      },
    ];
    const tenantRows = [
      {
        id: 'tenant-1',
        slug: 'acme',
        enabledModules: ['inventory'],
      },
    ];

    const result = buildAppMetadata(memberships, tenantRows, true);

    expect(result?.is_super_admin).toBe(true);
    expect(result?.tenant_id).toBe('tenant-1');
    expect(result?.tenant_slug).toBe('acme');
    expect(result?.role).toBe('owner');
  });

  it('sets is_super_admin: false for regular user with memberships', () => {
    const memberships = [
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'viewer' as const,
        isDefault: true,
      },
    ];
    const tenantRows = [
      {
        id: 'tenant-1',
        slug: 'acme',
        enabledModules: ['inventory'],
      },
    ];

    const result = buildAppMetadata(memberships, tenantRows, false);

    expect(result?.is_super_admin).toBe(false);
  });
});
