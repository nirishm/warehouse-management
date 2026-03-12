import { ModuleManifest } from '@/core/modules/types';

export const auditTrailManifest: ModuleManifest = {
  id: 'audit_trail',
  name: 'Audit Trail',
  description: 'View all system activity logs',
  icon: 'ScrollText',
  dependencies: [],
  permissions: ['canViewAuditLog'],
  navItems: [
    { label: 'Audit Log', href: 'audit-log', icon: 'ScrollText', permission: 'canViewAuditLog', group: 'reports' },
  ],
};
