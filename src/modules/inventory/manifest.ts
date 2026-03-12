import { ModuleManifest } from '@/core/modules/types';

export const inventoryManifest: ModuleManifest = {
  id: 'inventory',
  name: 'Inventory',
  description: 'Track stock levels across locations',
  icon: 'Package',
  dependencies: [],
  permissions: ['canViewStock', 'canManageLocations', 'canManageCommodities', 'canManageContacts'],
  navItems: [
    { label: 'Stock Levels', href: 'inventory', icon: 'Package', permission: 'canViewStock', group: 'inventory' },
    { label: 'Locations', href: 'settings/locations', icon: 'MapPin', permission: 'canManageLocations', group: 'settings' },
    { label: 'Items', href: 'settings/items', icon: 'Wheat', permission: 'canManageCommodities', group: 'settings' },
    { label: 'Contacts', href: 'settings/contacts', icon: 'Users', permission: 'canManageContacts', group: 'settings' },
    { label: 'Custom Fields', href: 'settings/custom-fields', icon: 'SlidersHorizontal', group: 'settings' },
  ],
};
