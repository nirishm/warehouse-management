import { ModuleManifest } from '@/core/modules/types';

export const inventoryManifest: ModuleManifest = {
  id: 'inventory',
  name: 'Inventory',
  description: 'Track stock levels across locations',
  icon: 'Package',
  dependencies: [],
  permissions: ['canViewStock', 'canManageLocations', 'canManageCommodities', 'canManageContacts'],
  navItems: [
    { label: 'Stock Levels', href: 'inventory', icon: 'Package', permission: 'canViewStock' },
    { label: 'Locations', href: 'settings/locations', icon: 'MapPin', permission: 'canManageLocations' },
    { label: 'Commodities', href: 'settings/commodities', icon: 'Wheat', permission: 'canManageCommodities' },
    { label: 'Contacts', href: 'settings/contacts', icon: 'Users', permission: 'canManageContacts' },
  ],
};
