import { ModuleManifest } from '@/core/modules/types';

export const shortageTrackingManifest: ModuleManifest = {
  id: 'shortage_tracking',
  name: 'Shortage Tracking',
  description: 'Track and analyze dispatch shortages',
  icon: 'AlertTriangle',
  dependencies: ['inventory', 'dispatch'],
  permissions: ['canViewAnalytics'],
  navItems: [
    { label: 'Shortages', href: 'shortage-tracking', icon: 'AlertTriangle', permission: 'canViewAnalytics', group: 'inventory' },
  ],
};
