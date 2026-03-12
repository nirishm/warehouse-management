import { ModuleManifest, ModuleNavItem } from './types';
import { validateModuleId } from './validate-module-id';

export class ModuleRegistry {
  private modules = new Map<string, ModuleManifest>();

  register(mod: ModuleManifest): void {
    validateModuleId(mod.id);
    this.modules.set(mod.id, mod);
  }

  get(id: string): ModuleManifest | undefined {
    return this.modules.get(id);
  }

  getAll(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }

  getEnabledModules(enabledIds: string[]): ModuleManifest[] {
    return enabledIds
      .map(id => this.modules.get(id))
      .filter((mod): mod is ModuleManifest => {
        if (!mod) return false;
        return mod.dependencies.every(dep => enabledIds.includes(dep));
      });
  }

  getNavItems(enabledIds: string[], permissions: Record<string, boolean>): ModuleNavItem[] {
    return this.getEnabledModules(enabledIds)
      .flatMap(mod => mod.navItems)
      .filter(item => !item.permission || permissions[item.permission]);
  }

  getDependents(moduleId: string): string[] {
    return this.getAll()
      .filter(mod => mod.dependencies.includes(moduleId))
      .map(mod => mod.id);
  }
}

export const moduleRegistry = new ModuleRegistry();
