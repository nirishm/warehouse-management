import type { ModuleManifest } from '@/core/modules/types';

export const shortageTrackingManifest: ModuleManifest = {
  id: 'shortage-tracking',
  name: 'Shortage Tracking',
  description: 'Track and resolve shortages identified during transfer receiving.',
  version: '1.0.0',
  icon: 'AlertTriangle',
  dependencies: ['transfer'],
  permissions: [
    'transfers:receive',
  ],
  routes: [
    {
      path: '/shortage-tracking',
      label: 'Shortage Tracking',
      icon: 'AlertTriangle',
      group: 'Main',
      permission: 'transfers:receive',
    },
  ],
};
