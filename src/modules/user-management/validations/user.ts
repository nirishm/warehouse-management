import { z } from 'zod';

export const permissionsSchema = z.object({
  canPurchase: z.boolean(),
  canDispatch: z.boolean(),
  canReceive: z.boolean(),
  canSale: z.boolean(),
  canViewStock: z.boolean(),
  canManageLocations: z.boolean(),
  canManageCommodities: z.boolean(),
  canManageContacts: z.boolean(),
  canViewAnalytics: z.boolean(),
  canExportData: z.boolean(),
  canViewAuditLog: z.boolean(),
  canManagePayments: z.boolean(),
  canManageAlerts: z.boolean(),
  canGenerateDocuments: z.boolean(),
  canManageLots: z.boolean(),
  canManageReturns: z.boolean(),
  canImportData: z.boolean(),
  canManageAdjustments: z.boolean(),
});

export const updateUserProfileSchema = z.object({
  display_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
  permissions: permissionsSchema.optional(),
});

export const updateUserLocationsSchema = z.object({
  location_ids: z.array(z.string().uuid()),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserLocationsInput = z.infer<typeof updateUserLocationsSchema>;
export type Permissions = z.infer<typeof permissionsSchema>;

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  canPurchase: 'Purchase',
  canDispatch: 'Dispatch',
  canReceive: 'Receive',
  canSale: 'Sale',
  canViewStock: 'View Stock',
  canManageLocations: 'Manage Locations',
  canManageCommodities: 'Manage Items',
  canManageContacts: 'Manage Contacts',
  canViewAnalytics: 'View Analytics',
  canExportData: 'Export Data',
  canViewAuditLog: 'View Audit Log',
  canManagePayments: 'Manage Payments',
  canManageAlerts: 'Manage Alerts',
  canGenerateDocuments: 'Generate Documents',
  canManageLots: 'Manage Lots',
  canManageReturns: 'Manage Returns',
  canImportData: 'Import Data',
  canManageAdjustments: 'Manage Adjustments',
};

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  permissions: Permissions | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends UserProfile {
  role: 'tenant_admin' | 'manager' | 'employee';
}

export interface UserWithLocations extends UserWithRole {
  locations: { id: string; user_id: string; location_id: string }[];
}
