import type { ModuleManifest } from '@/core/modules/types';

export const transferManifest: ModuleManifest = {
  id: 'transfer',
  name: 'Transfers',
  description: 'Inter-location stock transfers: dispatch, transit, and receiving.',
  version: '1.0.0',
  icon: 'ArrowLeftRight',
  dependencies: ['inventory'],
  permissions: [
    'transfers:read',
    'transfers:create',
    'transfers:receive',
  ],
  routes: [
    {
      path: '/transfers',
      label: 'Transfers',
      icon: 'ArrowLeftRight',
      group: 'Transactions',
      permission: 'transfers:create',
    },
  ],
};
