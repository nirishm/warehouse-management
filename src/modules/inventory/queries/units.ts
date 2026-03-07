import { createTenantClient } from '@/core/db/tenant-query';

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  is_default: boolean;
}

export async function listUnits(schemaName: string): Promise<Unit[]> {
  const client = createTenantClient(schemaName);

  const { data, error } = await client
    .from('units')
    .select('id, name, abbreviation, type, is_default')
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to list units: ${error.message}`);
  return (data ?? []) as Unit[];
}
