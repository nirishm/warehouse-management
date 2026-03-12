import type { ModuleManifest } from '@/core/modules/types';

export const saleManifest: ModuleManifest = {
  id: 'sale',
  name: 'Sales',
  description: 'Sales order management: create, confirm, dispatch, and track sales.',
  version: '1.0.0',
  icon: 'ShoppingCart',
  dependencies: ['inventory'],
  permissions: [
    'orders:read',
    'orders:create',
    'orders:update',
  ],
  routes: [
    {
      path: '/sales',
      label: 'Sales',
      icon: 'ShoppingCart',
      group: 'Transactions',
      permission: 'orders:create',
    },
  ],
};
