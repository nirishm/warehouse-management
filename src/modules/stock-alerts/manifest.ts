import { ModuleManifest } from '@/core/modules/types';
import { registerModuleMigration } from '@/core/db/module-migrations';
import { applyStockAlertsMigration } from './migrations/apply';

registerModuleMigration('stock-alerts', applyStockAlertsMigration);

export const stockAlertsManifest: ModuleManifest = {
  id: 'stock-alerts',
  name: 'Stock Alerts',
  description: 'Min stock and reorder point thresholds with alert states',
  icon: 'Bell',
  dependencies: ['inventory'],
  permissions: ['canManageAlerts'],
  navItems: [
    { label: 'Stock Alerts', href: 'stock-alerts', icon: 'Bell', permission: 'canManageAlerts', group: 'inventory' },
    { label: 'Alert Thresholds', href: 'stock-alerts/thresholds', icon: 'Settings', permission: 'canManageAlerts', group: 'inventory' },
  ],
};
