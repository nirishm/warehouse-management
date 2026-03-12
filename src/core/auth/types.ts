export type { Permission } from './permissions';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  schemaName: string;
  role: 'tenant_admin' | 'manager' | 'employee';
  enabledModules: string[];
  userId: string;
  userName: string;
  permissions: Record<import('./permissions').Permission, boolean>;
  allowedLocationIds: string[] | null;
}
