export type Permission =
  | 'canPurchase' | 'canDispatch' | 'canReceive' | 'canSale'
  | 'canViewStock' | 'canManageLocations' | 'canManageCommodities'
  | 'canManageContacts' | 'canViewAnalytics' | 'canExportData'
  | 'canViewAuditLog' | 'canManagePayments' | 'canManageAlerts'
  | 'canGenerateDocuments' | 'canManageLots' | 'canManageReturns'
  | 'canImportData' | 'canManageAdjustments';

export const ALL_PERMISSIONS: Permission[] = [
  'canPurchase', 'canDispatch', 'canReceive', 'canSale',
  'canViewStock', 'canManageLocations', 'canManageCommodities',
  'canManageContacts', 'canViewAnalytics', 'canExportData',
  'canViewAuditLog', 'canManagePayments', 'canManageAlerts',
  'canGenerateDocuments', 'canManageLots', 'canManageReturns',
  'canImportData', 'canManageAdjustments',
];

export const DEFAULT_PERMISSIONS: Record<Permission, boolean> = Object.fromEntries(
  ALL_PERMISSIONS.map((p) => [p, false])
) as Record<Permission, boolean>;

export function getAdminPermissions(): Record<Permission, boolean> {
  return Object.fromEntries(
    ALL_PERMISSIONS.map((p) => [p, true])
  ) as Record<Permission, boolean>;
}
