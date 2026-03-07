import { ModuleManifest } from '@/core/modules/types';

export const dispatchManifest: ModuleManifest = {
  id: 'dispatch',
  name: 'Dispatch',
  description: 'Manage inter-location movements',
  icon: 'Truck',
  dependencies: ['inventory'],
  permissions: ['canDispatch', 'canReceive'],
  navItems: [
    { label: 'Dispatches', href: 'dispatches', icon: 'Truck', permission: 'canDispatch' },
  ],
};
