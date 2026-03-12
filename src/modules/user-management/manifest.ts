import type { ModuleManifest } from '@/core/modules/types';

export const userManagementManifest: ModuleManifest = {
  id: 'user-management',
  name: 'User Management',
  description: 'Manage tenant users, roles, and access control.',
  version: '1.0.0',
  icon: 'UserCog',
  dependencies: [],
  permissions: [
    'users:read',
    'users:manage',
  ],
  routes: [
    {
      path: '/settings/users',
      label: 'Users',
      icon: 'UserCog',
      group: 'Settings',
      permission: 'users:manage',
    },
  ],
};
