import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaginationParams, applyPagination, PaginatedResponse, paginatedResult } from '@/lib/pagination';
import type { CreatePurchaseInput, Purchase, PurchaseItem } from '../validations/purchase';

export async function listPurchases(
  schemaName: string,
  options?: { allowedLocationIds?: string[] | null; pagination?: PaginationParams }
): Promise<PaginatedResponse<Purchase>> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('purchases')
    .select(`
      *,
      location:locations!location_id(id, name, code),
      contact:contacts!contact_id(id, name),
      items:purchase_items(id)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const ids = options?.allowedLocationIds;
  if (ids !== null && ids !== undefined && ids.length > 0) {
    query = query.in('location_id', ids);
  }

  if (options?.pagination) {
    query = applyPagination(query, options.pagination);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list purchases: ${error.message}`);

  const pagination = options?.pagination ?? { page: 1, pageSize: count ?? 0 };
  return paginatedResult((data ?? []) as Purchase[], count ?? 0, pagination);
}

export async function getPurchaseById(
  schemaName: string,
  id: string
): Promise<Purchase | null> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('purchases')
    .select(`
      *,
      location:locations!location_id(id, name, code),
      contact:contacts!contact_id(id, name),
      items:purchase_items(
        id, purchase_id, commodity_id, unit_id, quantity, bags, unit_price, custom_fields, created_at,
        commodity:commodities!commodity_id(id, name, code),
        unit:units!unit_id(id, name, abbreviation)
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get purchase: ${error.message}`);
  }
  return data as Purchase;
}

export async function createPurchase(
  schemaName: string,
  input: CreatePurchaseInput,
  userId: string
): Promise<Purchase> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('create_purchase_txn', {
    p_schema: schemaName,
    p_input: input,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to create purchase: ${error.message}`);
  return data as Purchase;
}

export async function cancelPurchase(
  schemaName: string,
  id: string
): Promise<Purchase> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('purchases')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to cancel purchase: ${error.message}`);
  return data as Purchase;
}
