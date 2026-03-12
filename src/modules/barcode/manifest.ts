import { ModuleManifest } from '@/core/modules/types';

export const barcodeManifest: ModuleManifest = {
  id: 'barcode',
  name: 'Barcodes',
  description: 'Generate QR codes and barcodes for items; printable label sheets',
  icon: 'QrCode',
  dependencies: ['inventory'],
  permissions: [],
  navItems: [
    { label: 'Barcodes', href: 'barcodes', icon: 'QrCode', group: 'reports' },
  ],
};
