import type { ModuleManifest } from '@/core/modules/types';

export const paymentsManifest: ModuleManifest = {
  id: 'payments',
  name: 'Payments',
  description: 'Payment tracking for sales and purchase orders.',
  version: '1.0.0',
  icon: 'CreditCard',
  dependencies: ['inventory'],
  permissions: [
    'payments:read',
    'payments:manage',
  ],
  routes: [
    {
      path: '/payments',
      label: 'Payments',
      icon: 'CreditCard',
      group: 'Transactions',
      permission: 'payments:manage',
    },
  ],
};
