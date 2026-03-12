const SCHEMA_NAME_RE = /^[a-z_][a-z0-9_]*$/;

export function validateSchemaName(name: string): string {
  if (!SCHEMA_NAME_RE.test(name)) {
    throw new Error('Invalid schema name');
  }
  return name;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(value: string, label = 'ID'): string {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}
