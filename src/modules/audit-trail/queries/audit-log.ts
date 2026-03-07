import { createTenantClient } from '@/core/db/tenant-query';

export interface AuditEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditEntryInput {
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditFilters {
  entity_type?: string;
  action?: string;
  user_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditEntries(
  schemaName: string,
  filters?: AuditFilters
): Promise<{ data: AuditEntry[]; count: number }> {
  const client = createTenantClient(schemaName);
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  let query = client
    .from('audit_log')
    .select('id, user_id, user_name, action, entity_type, entity_id, metadata, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.entity_type) {
    query = query.eq('entity_type', filters.entity_type);
  }
  if (filters?.action) {
    query = query.eq('action', filters.action);
  }
  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters?.from) {
    query = query.gte('created_at', filters.from);
  }
  if (filters?.to) {
    query = query.lte('created_at', filters.to);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list audit entries: ${error.message}`);

  return {
    data: (data ?? []) as AuditEntry[],
    count: count ?? 0,
  };
}

export async function createAuditEntry(
  schemaName: string,
  entry: AuditEntryInput
): Promise<AuditEntry> {
  const client = createTenantClient(schemaName);

  const { data, error } = await client
    .from('audit_log')
    .insert({
      user_id: entry.user_id,
      user_name: entry.user_name,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      old_data: entry.old_data ?? null,
      new_data: entry.new_data ?? null,
      metadata: entry.metadata ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create audit entry: ${error.message}`);

  return data as AuditEntry;
}

export async function getAuditEntry(
  schemaName: string,
  id: string
): Promise<AuditEntry | null> {
  const client = createTenantClient(schemaName);

  const { data, error } = await client
    .from('audit_log')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get audit entry: ${error.message}`);
  }

  return data as AuditEntry;
}
