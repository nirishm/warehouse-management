export type ModuleMigration = (schemaName: string) => Promise<void>;

const registry = new Map<string, ModuleMigration>();

export function registerModuleMigration(id: string, fn: ModuleMigration) {
  registry.set(id, fn);
}

export async function applyModuleMigration(id: string, schema: string) {
  const fn = registry.get(id);
  if (fn) await fn(schema);
}
