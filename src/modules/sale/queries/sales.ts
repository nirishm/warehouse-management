import { createTenantClient, getNextSequenceNumber } from '@/core/db/tenant-query';
import { PaginationParams, applyPagination, PaginatedResponse, paginatedResult } from '@/lib/pagination';
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

  const ids = options?.allowedLocationIds;
  if (ids !== null && ids !== undefined && ids.length > 0) {
    query = query.in('location_id', ids);
  }

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
  const client = createTenantClient(schemaName);
  const saleNumber = await getNextSequenceNumber(schemaName, 'sale');

  // Insert sale header
  const { data: sale, error: saleError } = await client
    .from('sales')
    .insert({
      sale_number: saleNumber,
      location_id: input.location_id,
      contact_id: input.contact_id ?? null,
      status: 'confirmed',
      transporter_name: input.transporter_name || null,
      vehicle_number: input.vehicle_number || null,
      driver_name: input.driver_name || null,
      driver_phone: input.driver_phone || null,
      notes: input.notes || null,
      created_by: userId,
      sold_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (saleError) throw new Error(`Failed to create sale: ${saleError.message}`);

  // Insert sale items
  const itemsToInsert = input.items.map((item) => ({
    sale_id: sale.id,
    commodity_id: item.commodity_id,
    unit_id: item.unit_id,
    quantity: item.quantity,
    bags: item.bags ?? null,
    unit_price: item.unit_price ?? null,
  }));

  const { error: itemsError } = await client
    .from('sale_items')
    .insert(itemsToInsert);

  if (itemsError) throw new Error(`Failed to create sale items: ${itemsError.message}`);

  return sale as Sale;
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
