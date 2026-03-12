import type { ModuleManifest } from '@/core/modules/types';

export const purchaseManifest: ModuleManifest = {
  id: 'purchase',
  name: 'Purchases',
  description: 'Purchase order management: create, order, and receive stock from suppliers.',
  version: '1.0.0',
  icon: 'ShoppingBag',
  dependencies: ['inventory'],
  permissions: [
    'orders:read',
    'orders:create',
    'orders:update',
  ],
  routes: [
    {
      path: '/purchases',
      label: 'Purchases',
      icon: 'ShoppingBag',
      group: 'Transactions',
      permission: 'orders:create',
    },
  ],
};
