import { ModuleManifest } from '@/core/modules/types';
import { registerModuleMigration } from '@/core/db/module-migrations';
import { applyLotTrackingMigration } from './migrations/apply';

registerModuleMigration('lot-tracking', applyLotTrackingMigration);

export const lotTrackingManifest: ModuleManifest = {
  id: 'lot-tracking',
  name: 'Lot Tracking',
  description: 'Lot/batch numbers, expiry dates, and FIFO stock depletion',
  icon: 'Layers',
  dependencies: ['inventory', 'purchase'],
  permissions: ['canManageLots'],
  navItems: [
    { label: 'Lots', href: 'lots', icon: 'Layers', permission: 'canManageLots', group: 'inventory' },
  ],
};
