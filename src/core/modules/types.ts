export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  dependencies: string[];
  permissions: string[];
  navItems: ModuleNavItem[];
}

export interface ModuleNavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
}
