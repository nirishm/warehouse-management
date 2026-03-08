import { ModuleManifest } from '@/core/modules/types';

export const bulkImportManifest: ModuleManifest = {
  id: 'bulk-import',
  name: 'Bulk Import / Export',
  description: 'CSV import for commodities, contacts, and initial stock; CSV export for all entities',
  icon: 'Upload',
  dependencies: ['inventory'],
  permissions: ['canImportData'],
  navItems: [
    { label: 'Import / Export', href: 'bulk-import', icon: 'Upload', permission: 'canImportData' },
  ],
};
