import type { Role, TenantContext } from './types';

export type Permission =
  | 'inventory:read'
  | 'inventory:write'
  | 'items:read'
  | 'items:write'
  | 'items:delete'
  | 'orders:create'
  | 'orders:update'
  | 'orders:delete'
  | 'transfers:create'
  | 'transfers:receive'
  | 'adjustments:create'
  | 'adjustments:approve'
  | 'reports:read'
  | 'reports:export'
  | 'users:manage'
  | 'settings:manage'
  | 'modules:manage'
  | 'audit:read'
  | 'tenant:manage'
  | 'billing:manage'
  | 'barcodes:scan'
  | 'receive:create'
  | 'payments:manage';

// Each role's permissions are FLAT — fully inherited from all lower roles.
const VIEWER_PERMISSIONS: Permission[] = [
  'inventory:read',
  'items:read',
];

const OPERATOR_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  'orders:create',
  'orders:update',
  'receive:create',
  'barcodes:scan',
];

const MANAGER_PERMISSIONS: Permission[] = [
  ...OPERATOR_PERMISSIONS,
  'items:write',
  'orders:delete',
  'transfers:create',
  'transfers:receive',
  'reports:read',
  'reports:export',
  'adjustments:create',
  'payments:manage',
  'inventory:write',
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...MANAGER_PERMISSIONS,
  'items:delete',
  'adjustments:approve',
  'users:manage',
  'settings:manage',
  'modules:manage',
  'audit:read',
];

const OWNER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  'tenant:manage',
  'billing:manage',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: VIEWER_PERMISSIONS,
  operator: OPERATOR_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  owner: OWNER_PERMISSIONS,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(ctx: TenantContext, permission: Permission): void {
  if (!hasPermission(ctx.role, permission)) {
    throw new Error(
      `Permission denied: role '${ctx.role}' does not have '${permission}'`,
    );
  }
}
