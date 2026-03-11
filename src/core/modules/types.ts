export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  dependencies: string[];
  permissions: string[];
  navItems: ModuleNavItem[];
}

export type NavGroup = 'operations' | 'inventory' | 'reports' | 'settings';

export interface ModuleNavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
  group?: NavGroup;
}
