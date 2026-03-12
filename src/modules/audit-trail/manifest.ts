import type { ModuleManifest } from '@/core/modules/types';

export const auditTrailManifest: ModuleManifest = {
  id: 'audit-trail',
  name: 'Audit Trail',
  description: 'Immutable audit log of all mutations across the system.',
  version: '1.0.0',
  icon: 'FileText',
  dependencies: [],
  permissions: [
    'audit:read',
  ],
  routes: [
    {
      path: '/audit-log',
      label: 'Audit Log',
      icon: 'FileText',
      group: 'Main',
      permission: 'audit:read',
    },
  ],
};
