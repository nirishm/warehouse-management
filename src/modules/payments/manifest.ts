import { ModuleManifest } from '@/core/modules/types';
import { registerModuleMigration } from '@/core/db/module-migrations';
import { applyPaymentsMigration } from './migrations/apply';

registerModuleMigration('payments', applyPaymentsMigration);

export const paymentsManifest: ModuleManifest = {
  id: 'payments',
  name: 'Payments',
  description: 'Track payment status on purchases and sales',
  icon: 'CreditCard',
  dependencies: ['inventory'],
  permissions: ['canManagePayments'],
  navItems: [
    { label: 'Payments', href: 'payments', icon: 'CreditCard', permission: 'canManagePayments', group: 'reports' },
  ],
};
