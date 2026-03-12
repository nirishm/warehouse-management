import { validateModuleId } from '../modules/validate-module-id';

export type ModuleMigration = (schemaName: string) => Promise<void>;

const registry = new Map<string, ModuleMigration>();

export function registerModuleMigration(id: string, fn: ModuleMigration) {
  validateModuleId(id);
  registry.set(id, fn);
}

export async function applyModuleMigration(id: string, schema: string) {
  const fn = registry.get(id);
  if (fn) await fn(schema);
}
