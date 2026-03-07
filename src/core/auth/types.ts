export type Permission =
  | 'canPurchase' | 'canDispatch' | 'canReceive' | 'canSale'
  | 'canViewStock' | 'canManageLocations' | 'canManageCommodities'
  | 'canManageContacts' | 'canViewAnalytics' | 'canExportData'
  | 'canViewAuditLog';

export interface TenantContext {
  tenantId: string;
  schemaName: string;
  role: 'tenant_admin' | 'manager' | 'employee';
  enabledModules: string[];
  userId: string;
  permissions: Record<Permission, boolean>;
  allowedLocationIds: string[] | null;
}
