import { ModuleManifest } from '@/core/modules/types';
import { registerModuleMigration } from '@/core/db/module-migrations';
import { applyDocumentGenMigration } from './migrations/apply';

registerModuleMigration('document-gen', applyDocumentGenMigration);

export const documentGenManifest: ModuleManifest = {
  id: 'document-gen',
  name: 'Document Generation',
  description: 'Generate printable PDFs — Dispatch Challan, GRN, Delivery Note',
  icon: 'FileText',
  dependencies: ['inventory'],
  permissions: ['canGenerateDocuments'],
  navItems: [
    { label: 'Documents', href: 'settings/documents', icon: 'FileText', permission: 'canGenerateDocuments', group: 'settings' },
  ],
};
