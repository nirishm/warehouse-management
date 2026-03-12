export interface ModuleRoute {
  path: string;        // e.g. '/settings/items'
  label: string;       // e.g. 'Items'
  icon: string;        // Icon name (lucide-react icon names)
  permission?: string; // Permission required to see this route
  group?: string;      // Nav group (e.g. 'Settings', 'Transactions')
}

export interface ModuleManifest {
  id: string;           // e.g. 'inventory'
  name: string;         // e.g. 'Inventory'
  description: string;
  version: string;
  icon: string;
  dependencies: string[];  // Other module IDs this depends on
  permissions: string[];   // Permissions this module introduces
  routes: ModuleRoute[];
}
