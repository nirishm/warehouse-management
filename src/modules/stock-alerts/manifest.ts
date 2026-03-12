import type { ModuleManifest } from '@/core/modules/types';

export const stockAlertsManifest: ModuleManifest = {
  id: 'stock-alerts',
  name: 'Stock Alerts',
  description: 'Configurable low-stock and reorder-point alerts.',
  version: '1.0.0',
  icon: 'Bell',
  dependencies: ['inventory'],
  permissions: [
    'inventory:read',
  ],
  routes: [
    {
      path: '/stock-alerts',
      label: 'Stock Alerts',
      icon: 'Bell',
      group: 'Main',
      permission: 'inventory:read',
    },
  ],
};
