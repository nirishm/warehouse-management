import { ModuleManifest } from '@/core/modules/types';

export const analyticsManifest: ModuleManifest = {
  id: 'analytics',
  name: 'Analytics',
  description: 'Dashboard and reporting',
  icon: 'BarChart3',
  dependencies: ['inventory'],
  permissions: ['canViewAnalytics'],
  navItems: [
    { label: 'Analytics', href: 'analytics', icon: 'BarChart3', permission: 'canViewAnalytics', group: 'reports' },
  ],
};
