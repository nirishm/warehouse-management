import { createTenantClient } from '@/core/db/tenant-query';
import { PaginationParams, applyPagination, PaginatedResponse, paginatedResult } from '@/lib/pagination';
import type { CreateCommodityInput, UpdateCommodityInput } from '../validations/commodity';

export interface Commodity {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  default_unit_id: string | null;
  is_active: boolean;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  unit_name?: string | null;
  unit_abbreviation?: string | null;
}

export async function listCommodities(
  schemaName: string,
  options?: { pagination?: PaginationParams }
): Promise<PaginatedResponse<Commodity>> {
  const client = createTenantClient(schemaName);

  let query = client
    .from('commodities')
    .select('*, units:default_unit_id(name, abbreviation)', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (options?.pagination) {
    query = applyPagination(query, options.pagination);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list items: ${error.message}`);

  const mapped = (data ?? []).map((row: Record<string, unknown>) => {
    const unit = row.units as { name: string; abbreviation: string } | null;
    return {
      ...row,
      unit_name: unit?.name ?? null,
      unit_abbreviation: unit?.abbreviation ?? null,
    } as Commodity;
  });

  const pagination = options?.pagination ?? { page: 1, pageSize: count ?? 0 };
  return paginatedResult(mapped, count ?? 0, pagination);
}

export async function getCommodityById(
  schemaName: string,
  id: string
): Promise<Commodity | null> {
  const client = createTenantClient(schemaName);

  const { data, error } = await client
    .from('commodities')
    .select('*, units:default_unit_id(name, abbreviation)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get item: ${error.message}`);
  }

  const unit = (data as Record<string, unknown>).units as { name: string; abbreviation: string } | null;
  return {
    ...data,
    unit_name: unit?.name ?? null,
    unit_abbreviation: unit?.abbreviation ?? null,
  } as Commodity;
}

export async function createCommodity(
  schemaName: string,
  input: CreateCommodityInput
): Promise<Commodity> {
  const client = createTenantClient(schemaName);

  const { data, error } = await client
    .from('commodities')
    .insert({
      ...input,
      is_active: true,
      custom_fields: {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create item: ${error.message}`);
  return data as Commodity;
}

export async function updateCommodity(
  schemaName: string,
  id: string,
  input: UpdateCommodityInput
): Promise<Commodity> {
  const client = createTenantClient(schemaName);

  const { data, error } = await client
    .from('commodities')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new Error(`Failed to update item: ${error.message}`);
  return data as Commodity;
}

export async function softDeleteCommodity(
  schemaName: string,
  id: string
): Promise<void> {
  const client = createTenantClient(schemaName);

  const { error } = await client
    .from('commodities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new Error(`Failed to delete item: ${error.message}`);
}
