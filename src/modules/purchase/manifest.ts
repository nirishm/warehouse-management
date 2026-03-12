import { ModuleManifest } from '@/core/modules/types';

export const purchaseManifest: ModuleManifest = {
  id: 'purchase',
  name: 'Purchase',
  description: 'Manage inbound purchases from suppliers',
  icon: 'ShoppingCart',
  dependencies: ['inventory'],
  permissions: ['canPurchase'],
  navItems: [
    { label: 'Purchases', href: 'purchases', icon: 'ShoppingCart', permission: 'canPurchase', group: 'operations' },
  ],
};
