import type { ModuleManifest, ModuleRoute } from './types';

class ModuleRegistry {
  private modules = new Map<string, ModuleManifest>();

  register(manifest: ModuleManifest): void {
    this.modules.set(manifest.id, manifest);
  }

  get(id: string): ModuleManifest | undefined {
    return this.modules.get(id);
  }

  getAll(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }

  /**
   * Returns only modules whose IDs are in the enabledModules list.
   */
  getEnabled(enabledModules: string[]): ModuleManifest[] {
    const enabledSet = new Set(enabledModules);
    return Array.from(this.modules.values()).filter((m) => enabledSet.has(m.id));
  }

  /**
   * Returns nav items for enabled modules, filtered by user permissions.
   * A module's routes are only included if all of its dependencies are also enabled.
   */
  getNavItems(
    enabledModules: string[],
    userPermissions: string[],
  ): Array<ModuleRoute & { moduleId: string }> {
    const enabledSet = new Set(enabledModules);
    const permissionSet = new Set(userPermissions);
    const result: Array<ModuleRoute & { moduleId: string }> = [];

    for (const manifest of this.modules.values()) {
      if (!enabledSet.has(manifest.id)) continue;

      // All dependencies must also be enabled
      const depsEnabled = manifest.dependencies.every((dep) => enabledSet.has(dep));
      if (!depsEnabled) continue;

      for (const route of manifest.routes) {
        // If a permission is required, the user must have it
        if (route.permission && !permissionSet.has(route.permission)) continue;

        result.push({ ...route, moduleId: manifest.id });
      }
    }

    return result;
  }

  /**
   * Returns all modules that declare a dependency on the given moduleId.
   */
  getDependents(moduleId: string): ModuleManifest[] {
    return Array.from(this.modules.values()).filter((m) =>
      m.dependencies.includes(moduleId),
    );
  }

  /**
   * Validates that:
   * 1. All declared dependencies exist in the registry.
   * 2. There are no circular dependency chains (DFS cycle detection).
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for missing dependency references
    for (const manifest of this.modules.values()) {
      for (const dep of manifest.dependencies) {
        if (!this.modules.has(dep)) {
          errors.push(
            `Module "${manifest.id}" depends on "${dep}" which is not registered.`,
          );
        }
      }
    }

    // DFS cycle detection
    const WHITE = 0; // unvisited
    const GRAY = 1;  // in current path
    const BLACK = 2; // fully processed

    const color = new Map<string, number>();
    for (const id of this.modules.keys()) {
      color.set(id, WHITE);
    }

    const dfs = (id: string, path: string[]): void => {
      color.set(id, GRAY);
      const manifest = this.modules.get(id);
      if (!manifest) return;

      for (const dep of manifest.dependencies) {
        if (!this.modules.has(dep)) continue; // already reported above
        const depColor = color.get(dep) ?? WHITE;
        if (depColor === GRAY) {
          const cycleIndex = path.indexOf(dep);
          const cycle = [...path.slice(cycleIndex), dep].join(' → ');
          errors.push(`Circular dependency detected: ${cycle}`);
        } else if (depColor === WHITE) {
          dfs(dep, [...path, dep]);
        }
      }

      color.set(id, BLACK);
    };

    for (const id of this.modules.keys()) {
      if ((color.get(id) ?? WHITE) === WHITE) {
        dfs(id, [id]);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const registry = new ModuleRegistry();
