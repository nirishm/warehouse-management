import { ModuleManifest } from '@/core/modules/types';

export const saleManifest: ModuleManifest = {
  id: 'sale',
  name: 'Sale',
  description: 'Manage outbound sales to customers',
  icon: 'Receipt',
  dependencies: ['inventory'],
  permissions: ['canSale'],
  navItems: [
    { label: 'Sales', href: 'sales', icon: 'Receipt', permission: 'canSale' },
  ],
};
