import type { ModuleManifest } from '@/core/modules/types';

export const adjustmentsManifest: ModuleManifest = {
  id: 'adjustments',
  name: 'Adjustments',
  description: 'Stock adjustment management: write-offs, corrections, and reconciliations.',
  version: '1.0.0',
  icon: 'Scale',
  dependencies: ['inventory'],
  permissions: [
    'adjustments:read',
    'adjustments:create',
  ],
  routes: [
    {
      path: '/adjustments',
      label: 'Adjustments',
      icon: 'Scale',
      group: 'Transactions',
      permission: 'adjustments:create',
    },
  ],
};
