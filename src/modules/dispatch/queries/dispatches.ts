import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaginationParams, applyPagination, PaginatedResponse, paginatedResult } from '@/lib/pagination';
import type {
  CreateDispatchInput,
  DispatchWithLocations,
  DispatchItemWithNames,
  Dispatch,
} from '../validations/dispatch';

export async function listDispatches(
  schemaName: string,
  options?: { allowedLocationIds?: string[] | null; pagination?: PaginationParams }
): Promise<PaginatedResponse<DispatchWithLocations>> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('dispatches')
    .select(
      '*, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name), dispatch_items(id)',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const ids = options?.allowedLocationIds;
  if (ids !== null && ids !== undefined) {
    if (ids.length === 0) {
      // No locations assigned — match nothing
      query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      const list = ids.join(',');
      query = query.or(`origin_location_id.in.(${list}),dest_location_id.in.(${list})`);
    }
  }

  if (options?.pagination) {
    query = applyPagination(query, options.pagination);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list dispatches: ${error.message}`);

  const mapped = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const items = row.dispatch_items as { id: string }[] | null;
    return {
      ...row,
      item_count: items?.length ?? 0,
    } as DispatchWithLocations;
  });

  const pagination = options?.pagination ?? { page: 1, pageSize: count ?? 0 };
  return paginatedResult(mapped, count ?? 0, pagination);
}

export async function getDispatchById(
  schemaName: string,
  id: string
): Promise<
  | (DispatchWithLocations & { dispatch_items: DispatchItemWithNames[] })
  | null
> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('dispatches')
    .select(
      '*, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name), dispatch_items(*, commodity:commodities(name, code), unit:units(name, abbreviation))'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get dispatch: ${error.message}`);
  }

  return data as DispatchWithLocations & {
    dispatch_items: DispatchItemWithNames[];
  };
}

export async function createDispatch(
  schemaName: string,
  input: CreateDispatchInput,
  userId: string
): Promise<Dispatch> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('create_dispatch_txn', {
    p_schema: schemaName,
    p_input: input,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to create dispatch: ${error.message}`);
  return data as Dispatch;
}

export async function cancelDispatch(
  schemaName: string,
  id: string
): Promise<void> {
  const client = createTenantClient(schemaName);
  const { error } = await client
    .from('dispatches')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new Error(`Failed to cancel dispatch: ${error.message}`);
}
