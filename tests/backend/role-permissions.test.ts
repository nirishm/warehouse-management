import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  requirePermission,
  ROLE_PERMISSIONS,
  type Permission,
} from '@/core/auth/permissions';
import type { TenantContext } from '@/core/auth/types';

// ── Role Permission Tests ─────────────────────────────────────────────────────

// Helper: build minimal TenantContext for requirePermission
function makeCtx(role: TenantContext['role']): TenantContext {
  return {
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantSlug: 'test',
    role,
    userId: '00000000-0000-0000-0000-000000000099',
    userEmail: 'test@example.com',
    enabledModules: [],
  };
}

describe('Role-Based Access Control', () => {
  describe('Viewer permissions', () => {
    it('has inventory:read and items:read', () => {
      expect(hasPermission('viewer', 'inventory:read')).toBe(true);
      expect(hasPermission('viewer', 'items:read')).toBe(true);
    });

    it('does NOT have orders:create, items:write, transfers:create', () => {
      expect(hasPermission('viewer', 'orders:create')).toBe(false);
      expect(hasPermission('viewer', 'items:write')).toBe(false);
      expect(hasPermission('viewer', 'transfers:create')).toBe(false);
    });
  });

  describe('Operator permissions (inherits viewer)', () => {
    it('has orders:create, orders:update, receive:create, barcodes:scan, transfers:create', () => {
      expect(hasPermission('operator', 'orders:create')).toBe(true);
      expect(hasPermission('operator', 'orders:update')).toBe(true);
      expect(hasPermission('operator', 'receive:create')).toBe(true);
      expect(hasPermission('operator', 'barcodes:scan')).toBe(true);
      expect(hasPermission('operator', 'transfers:create')).toBe(true);
    });

    it('inherits viewer permissions: inventory:read, items:read', () => {
      expect(hasPermission('operator', 'inventory:read')).toBe(true);
      expect(hasPermission('operator', 'items:read')).toBe(true);
    });

    it('does NOT have items:write, adjustments:approve, users:manage', () => {
      expect(hasPermission('operator', 'items:write')).toBe(false);
      expect(hasPermission('operator', 'adjustments:approve')).toBe(false);
      expect(hasPermission('operator', 'users:manage')).toBe(false);
    });
  });

  describe('Manager permissions (inherits operator)', () => {
    it('has items:write, orders:delete, transfers:receive, adjustments:create, payments:manage', () => {
      expect(hasPermission('manager', 'items:write')).toBe(true);
      expect(hasPermission('manager', 'orders:delete')).toBe(true);
      expect(hasPermission('manager', 'transfers:receive')).toBe(true);
      expect(hasPermission('manager', 'adjustments:create')).toBe(true);
      expect(hasPermission('manager', 'payments:manage')).toBe(true);
    });

    it('inherits operator permissions: orders:create, transfers:create', () => {
      expect(hasPermission('manager', 'orders:create')).toBe(true);
      expect(hasPermission('manager', 'transfers:create')).toBe(true);
    });

    it('does NOT have adjustments:approve, users:manage, tenant:manage, billing:manage', () => {
      expect(hasPermission('manager', 'adjustments:approve')).toBe(false);
      expect(hasPermission('manager', 'users:manage')).toBe(false);
      expect(hasPermission('manager', 'tenant:manage')).toBe(false);
      expect(hasPermission('manager', 'billing:manage')).toBe(false);
    });
  });

  describe('Admin permissions (inherits manager)', () => {
    it('has adjustments:approve, users:manage, settings:manage, audit:read', () => {
      expect(hasPermission('admin', 'adjustments:approve')).toBe(true);
      expect(hasPermission('admin', 'users:manage')).toBe(true);
      expect(hasPermission('admin', 'settings:manage')).toBe(true);
      expect(hasPermission('admin', 'audit:read')).toBe(true);
    });

    it('inherits manager permissions: items:write, orders:delete', () => {
      expect(hasPermission('admin', 'items:write')).toBe(true);
      expect(hasPermission('admin', 'orders:delete')).toBe(true);
    });

    it('does NOT have tenant:manage, billing:manage', () => {
      expect(hasPermission('admin', 'tenant:manage')).toBe(false);
      expect(hasPermission('admin', 'billing:manage')).toBe(false);
    });
  });

  describe('Owner permissions (inherits admin)', () => {
    it('has tenant:manage and billing:manage', () => {
      expect(hasPermission('owner', 'tenant:manage')).toBe(true);
      expect(hasPermission('owner', 'billing:manage')).toBe(true);
    });

    it('inherits all admin permissions', () => {
      const adminPerms = ROLE_PERMISSIONS.admin;
      adminPerms.forEach((perm) => {
        expect(hasPermission('owner', perm)).toBe(true);
      });
    });
  });

  describe('Cumulative inheritance', () => {
    it('each higher role has strictly more permissions than the one below', () => {
      const roles: TenantContext['role'][] = ['viewer', 'operator', 'manager', 'admin', 'owner'];

      for (let i = 1; i < roles.length; i++) {
        const lower = roles[i - 1];
        const higher = roles[i];
        const lowerPerms = new Set(ROLE_PERMISSIONS[lower]);
        const higherPerms = new Set(ROLE_PERMISSIONS[higher]);

        // Higher role must contain all lower role permissions
        lowerPerms.forEach((perm) => {
          expect(higherPerms.has(perm)).toBe(true);
        });

        // Higher role must have MORE permissions than lower role
        expect(higherPerms.size).toBeGreaterThan(lowerPerms.size);
      }
    });

    it('owner permissions is a strict superset of admin', () => {
      const ownerPerms = new Set(ROLE_PERMISSIONS.owner);
      const adminPerms = ROLE_PERMISSIONS.admin;

      adminPerms.forEach((perm) => expect(ownerPerms.has(perm)).toBe(true));
      expect(ROLE_PERMISSIONS.owner.length).toBeGreaterThan(ROLE_PERMISSIONS.admin.length);
    });

    it('admin permissions is a strict superset of manager', () => {
      const adminPerms = new Set(ROLE_PERMISSIONS.admin);
      const managerPerms = ROLE_PERMISSIONS.manager;

      managerPerms.forEach((perm) => expect(adminPerms.has(perm)).toBe(true));
      expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(ROLE_PERMISSIONS.manager.length);
    });
  });

  describe('requirePermission throws correctly', () => {
    it('throws for viewer attempting orders:create', () => {
      const ctx = makeCtx('viewer');
      expect(() => requirePermission(ctx, 'orders:create')).toThrow();
    });

    it('does NOT throw for operator attempting orders:create', () => {
      const ctx = makeCtx('operator');
      expect(() => requirePermission(ctx, 'orders:create')).not.toThrow();
    });

    it('throws for manager attempting tenant:manage', () => {
      const ctx = makeCtx('manager');
      expect(() => requirePermission(ctx, 'tenant:manage')).toThrow();
    });

    it('does NOT throw for owner attempting any permission', () => {
      const ctx = makeCtx('owner');
      const allPerms = ROLE_PERMISSIONS.owner as Permission[];
      allPerms.forEach((perm) => {
        expect(() => requirePermission(ctx, perm)).not.toThrow();
      });
    });
  });
});
