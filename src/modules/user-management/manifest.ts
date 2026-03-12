import { ModuleManifest } from '@/core/modules/types';

export const userManagementManifest: ModuleManifest = {
  id: 'user-management',
  name: 'User Management',
  description: 'Manage users, roles, and permissions',
  icon: 'Users',
  dependencies: [],
  permissions: [],
  navItems: [
    { label: 'Users', href: 'settings/users', icon: 'Users', group: 'settings' },
  ],
};
