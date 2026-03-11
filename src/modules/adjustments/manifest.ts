import { ModuleManifest } from '@/core/modules/types';
import { registerModuleMigration } from '@/core/db/module-migrations';
import { applyAdjustmentsMigration } from './migrations/apply';

registerModuleMigration('adjustments', applyAdjustmentsMigration);

export const adjustmentsManifest: ModuleManifest = {
  id: 'adjustments',
  name: 'Inventory Adjustments',
  description: 'Record stock adjustments for breakage, spillage, corrections',
  icon: 'SlidersHorizontal',
  dependencies: ['inventory'],
  permissions: ['canManageAdjustments'],
  navItems: [
    {
      label: 'Adjustments',
      href: 'adjustments',
      icon: 'SlidersHorizontal',
      permission: 'canManageAdjustments',
      group: 'inventory',
    },
  ],
};
