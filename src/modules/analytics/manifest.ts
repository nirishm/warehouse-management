import type { ModuleManifest } from '@/core/modules/types';

export const analyticsManifest: ModuleManifest = {
  id: 'analytics',
  name: 'Analytics',
  description: 'Dashboard and reporting: inventory trends, sales performance, and KPIs.',
  version: '1.0.0',
  icon: 'BarChart3',
  dependencies: ['inventory'],
  permissions: [
    'reports:read',
  ],
  routes: [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'BarChart3',
      group: 'Main',
      permission: 'reports:read',
    },
  ],
};
