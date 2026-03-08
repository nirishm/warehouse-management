import { createTenantClient } from '@/core/db/tenant-query';
import type { DocumentConfig, UpdateDocumentConfigInput } from '../validations/config';

export async function getDocumentConfig(schemaName: string): Promise<DocumentConfig | null> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('document_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to get document config: ${error.message}`);
  return data as DocumentConfig | null;
}

export async function updateDocumentConfig(
  schemaName: string,
  input: UpdateDocumentConfigInput,
  userId: string
): Promise<DocumentConfig> {
  const client = createTenantClient(schemaName);

  const existing = await getDocumentConfig(schemaName);

  if (existing) {
    const { data, error } = await client
      .from('document_config')
      .update({ ...input, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to update document config: ${error.message}`);
    return data as DocumentConfig;
  } else {
    const { data, error } = await client
      .from('document_config')
      .insert({ ...input, updated_by: userId })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to create document config: ${error.message}`);
    return data as DocumentConfig;
  }
}
