import { ModuleManifest } from '@/core/modules/types';
import { registerModuleMigration } from '@/core/db/module-migrations';
import { applyReturnsMigration } from './migrations/apply';

registerModuleMigration('returns', applyReturnsMigration);

export const returnsManifest: ModuleManifest = {
  id: 'returns',
  name: 'Returns',
  description: 'Process purchase returns and sale returns with stock adjustment',
  icon: 'RotateCcw',
  dependencies: ['inventory', 'purchase', 'sale'],
  permissions: ['canManageReturns'],
  navItems: [
    { label: 'Returns', href: 'returns', icon: 'RotateCcw', permission: 'canManageReturns', group: 'operations' },
  ],
};
