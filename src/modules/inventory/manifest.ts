import type { ModuleManifest } from '@/core/modules/types';

export const inventoryManifest: ModuleManifest = {
  id: 'inventory',
  name: 'Inventory',
  description: 'Core inventory management: stock levels, items, locations, and contacts.',
  version: '1.0.0',
  icon: 'Package',
  dependencies: [],
  permissions: [
    'inventory:read',
    'inventory:write',
    'items:read',
    'items:write',
    'settings:manage',
  ],
  routes: [
    {
      path: '/inventory',
      label: 'Stock Levels',
      icon: 'Package',
      group: 'Main',
      permission: 'inventory:read',
    },
    {
      path: '/settings/items',
      label: 'Items',
      icon: 'Box',
      group: 'Settings',
      permission: 'items:read',
    },
    {
      path: '/settings/locations',
      label: 'Locations',
      icon: 'MapPin',
      group: 'Settings',
      permission: 'inventory:read',
    },
    {
      path: '/settings/contacts',
      label: 'Contacts',
      icon: 'Users',
      group: 'Settings',
      permission: 'items:read',
    },
    {
      path: '/settings/custom-fields',
      label: 'Custom Fields',
      icon: 'Settings',
      group: 'Settings',
      permission: 'settings:manage',
    },
  ],
};
