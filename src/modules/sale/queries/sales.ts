import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaginationParams, applyPagination, PaginatedResponse, paginatedResult } from '@/lib/pagination';
import { applyLocationFilter } from '@/core/db/query-helpers';
import type { CreateSaleInput, Sale } from '../validations/sale';

export async function listSales(
  schemaName: string,
  options?: { allowedLocationIds?: string[] | null; pagination?: PaginationParams }
): Promise<PaginatedResponse<Sale>> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('sales')
    .select(`
      *,
      location:locations!location_id(id, name, code),
      contact:contacts!contact_id(id, name),
      items:sale_items(id)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  query = applyLocationFilter(query, 'location_id', options?.allowedLocationIds ?? null);

  if (options?.pagination) {
    query = applyPagination(query, options.pagination);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list sales: ${error.message}`);

  const pagination = options?.pagination ?? { page: 1, pageSize: count ?? 0 };
  return paginatedResult((data ?? []) as Sale[], count ?? 0, pagination);
}

export async function getSaleById(
  schemaName: string,
  id: string
): Promise<Sale | null> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('sales')
    .select(`
      *,
      location:locations!location_id(id, name, code),
      contact:contacts!contact_id(id, name),
      items:sale_items(
        id, sale_id, commodity_id, unit_id, quantity, bags, unit_price, custom_fields, created_at,
        commodity:commodities!commodity_id(id, name, code),
        unit:units!unit_id(id, name, abbreviation)
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get sale: ${error.message}`);
  }
  return data as Sale;
}

export async function createSale(
  schemaName: string,
  input: CreateSaleInput,
  userId: string
): Promise<Sale> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('create_sale_txn', {
    p_schema: schemaName,
    p_input: input,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to create sale: ${error.message}`);
  return data as Sale;
}

export async function cancelSale(
  schemaName: string,
  id: string
): Promise<Sale> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('sales')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to cancel sale: ${error.message}`);
  return data as Sale;
}
