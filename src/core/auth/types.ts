export type Permission =
  | 'canPurchase' | 'canDispatch' | 'canReceive' | 'canSale'
  | 'canViewStock' | 'canManageLocations' | 'canManageCommodities'
  | 'canManageContacts' | 'canViewAnalytics' | 'canExportData'
  | 'canViewAuditLog'
  | 'canManagePayments'
  | 'canManageAlerts'
  | 'canGenerateDocuments'
  | 'canManageLots'
  | 'canManageReturns'
  | 'canImportData';

export interface TenantContext {
  tenantId: string;
  schemaName: string;
  role: 'tenant_admin' | 'manager' | 'employee';
  enabledModules: string[];
  userId: string;
  userName: string;
  permissions: Record<Permission, boolean>;
  allowedLocationIds: string[] | null;
}
