import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing anything that uses them
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('@/core/db/module-migrations', () => ({
  applyModuleMigration: vi.fn(),
}));
vi.mock('@/core/modules/registry', () => ({
  moduleRegistry: {
    get: vi.fn(),
  },
}));
// Suppress side-effect module registration
vi.mock('@/modules/index', () => ({}));

import { createAdminClient } from '@/lib/supabase/admin';
import { applyModuleMigration } from '@/core/db/module-migrations';
import { moduleRegistry } from '@/core/modules/registry';

// ─── Helpers ───────────────────────────────────────────────
// Extract the core PATCH logic into testable functions that mirror
// the route handler at src/app/api/admin/tenants/[id]/route.ts:54-97

function findNewlyEnabled(prev: string[], next: string[]): string[] {
  return next.filter((m) => !prev.includes(m));
}

function checkDependencies(
  newlyEnabled: string[],
  allEnabled: string[],
  registry: typeof moduleRegistry
): { moduleId: string; missingDeps: string[] } | null {
  for (const moduleId of newlyEnabled) {
    const manifest = registry.get(moduleId);
    if (manifest) {
      const missingDeps = manifest.dependencies.filter(
        (dep: string) => !allEnabled.includes(dep)
      );
      if (missingDeps.length > 0) {
        return { moduleId, missingDeps };
      }
    }
  }
  return null;
}

async function runMigrationsWithFailureHandling(
  newlyEnabled: string[],
  schemaName: string,
  prev: string[],
  requestedModules: string[]
): Promise<{ finalModules: string[]; migrationErrors: string[] }> {
  const migrationErrors: string[] = [];
  for (const moduleId of newlyEnabled) {
    try {
      await applyModuleMigration(moduleId, schemaName);
    } catch {
      migrationErrors.push(moduleId);
    }
  }
  let finalModules = requestedModules;
  if (migrationErrors.length > 0) {
    finalModules = requestedModules.filter(
      (m: string) => !migrationErrors.includes(m) || prev.includes(m)
    );
  }
  return { finalModules, migrationErrors };
}

// ─── Tests ─────────────────────────────────────────────────

describe('tenant PATCH module enable/disable logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findNewlyEnabled', () => {
    it('detects newly added modules', () => {
      expect(findNewlyEnabled(['inventory'], ['inventory', 'dispatch'])).toEqual(['dispatch']);
    });

    it('returns empty when no new modules', () => {
      expect(findNewlyEnabled(['inventory', 'dispatch'], ['inventory'])).toEqual([]);
    });

    it('returns all when starting from empty', () => {
      expect(findNewlyEnabled([], ['inventory', 'dispatch'])).toEqual(['inventory', 'dispatch']);
    });
  });

  describe('dependency checking', () => {
    it('passes when all dependencies are present', () => {
      vi.mocked(moduleRegistry.get).mockReturnValue({
        id: 'adjustments',
        name: 'Adjustments',
        dependencies: ['returns'],
        navItems: [],
        permissions: [],
      });

      const result = checkDependencies(
        ['adjustments'],
        ['inventory', 'returns', 'adjustments'],
        moduleRegistry
      );
      expect(result).toBeNull();
    });

    it('fails when a dependency is missing', () => {
      vi.mocked(moduleRegistry.get).mockReturnValue({
        id: 'adjustments',
        name: 'Adjustments',
        dependencies: ['returns'],
        navItems: [],
        permissions: [],
      });

      const result = checkDependencies(
        ['adjustments'],
        ['inventory', 'adjustments'],
        moduleRegistry
      );
      expect(result).toEqual({
        moduleId: 'adjustments',
        missingDeps: ['returns'],
      });
    });

    it('passes for modules with no dependencies', () => {
      vi.mocked(moduleRegistry.get).mockReturnValue({
        id: 'inventory',
        name: 'Inventory',
        dependencies: [],
        navItems: [],
        permissions: [],
      });

      const result = checkDependencies(
        ['inventory'],
        ['inventory'],
        moduleRegistry
      );
      expect(result).toBeNull();
    });

    it('passes for unknown modules (no manifest)', () => {
      vi.mocked(moduleRegistry.get).mockReturnValue(undefined);

      const result = checkDependencies(
        ['unknown-mod'],
        ['unknown-mod'],
        moduleRegistry
      );
      expect(result).toBeNull();
    });
  });

  describe('migration failure handling', () => {
    it('keeps all modules when migrations succeed', async () => {
      vi.mocked(applyModuleMigration).mockResolvedValue(undefined);

      const { finalModules, migrationErrors } = await runMigrationsWithFailureHandling(
        ['dispatch', 'returns'],
        'tenant_test',
        ['inventory'],
        ['inventory', 'dispatch', 'returns']
      );

      expect(migrationErrors).toEqual([]);
      expect(finalModules).toEqual(['inventory', 'dispatch', 'returns']);
      expect(applyModuleMigration).toHaveBeenCalledTimes(2);
      expect(applyModuleMigration).toHaveBeenCalledWith('dispatch', 'tenant_test');
      expect(applyModuleMigration).toHaveBeenCalledWith('returns', 'tenant_test');
    });

    it('removes failed module from enabled list', async () => {
      vi.mocked(applyModuleMigration)
        .mockResolvedValueOnce(undefined) // dispatch succeeds
        .mockRejectedValueOnce(new Error('SQL error')); // returns fails

      const { finalModules, migrationErrors } = await runMigrationsWithFailureHandling(
        ['dispatch', 'returns'],
        'tenant_test',
        ['inventory'],
        ['inventory', 'dispatch', 'returns']
      );

      expect(migrationErrors).toEqual(['returns']);
      expect(finalModules).toEqual(['inventory', 'dispatch']);
      // 'returns' was removed because it failed and was NOT in prev
    });

    it('keeps previously-enabled module even if migration re-run fails', async () => {
      // If a module was already enabled (in prev), don't remove it even if migration fails
      vi.mocked(applyModuleMigration)
        .mockRejectedValueOnce(new Error('SQL error'));

      const { finalModules, migrationErrors } = await runMigrationsWithFailureHandling(
        ['dispatch'], // newly enabled
        'tenant_test',
        ['inventory', 'dispatch'], // dispatch was already in prev (edge case)
        ['inventory', 'dispatch', 'returns']
      );

      // dispatch is in migrationErrors but also in prev, so it's kept
      expect(migrationErrors).toEqual(['dispatch']);
      expect(finalModules).toEqual(['inventory', 'dispatch', 'returns']);
    });

    it('removes all failed new modules', async () => {
      vi.mocked(applyModuleMigration)
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'));

      const { finalModules, migrationErrors } = await runMigrationsWithFailureHandling(
        ['dispatch', 'returns'],
        'tenant_test',
        ['inventory'],
        ['inventory', 'dispatch', 'returns']
      );

      expect(migrationErrors).toEqual(['dispatch', 'returns']);
      expect(finalModules).toEqual(['inventory']);
    });

    it('reports migration errors in response', async () => {
      vi.mocked(applyModuleMigration)
        .mockRejectedValueOnce(new Error('table exists'));

      const { migrationErrors } = await runMigrationsWithFailureHandling(
        ['payments'],
        'tenant_test',
        ['inventory'],
        ['inventory', 'payments']
      );

      expect(migrationErrors).toEqual(['payments']);
      // The route handler includes migrationErrors in the JSON response
      // when migrationErrors.length > 0 (line 108-110 of route.ts)
    });
  });
});
