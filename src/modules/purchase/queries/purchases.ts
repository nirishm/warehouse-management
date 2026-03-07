import { createTenantClient, getNextSequenceNumber } from '@/core/db/tenant-query';
import type { CreatePurchaseInput, Purchase, PurchaseItem } from '../validations/purchase';

export async function listPurchases(
  schemaName: string,
  options?: { allowedLocationIds?: string[] | null }
): Promise<Purchase[]> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('purchases')
    .select(`
      *,
      location:locations!location_id(id, name, code),
      contact:contacts!contact_id(id, name),
      items:purchase_items(id)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const ids = options?.allowedLocationIds;
  if (ids !== null && ids !== undefined && ids.length > 0) {
    query = query.in('location_id', ids);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list purchases: ${error.message}`);
  return (data ?? []) as Purchase[];
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
  const client = createTenantClient(schemaName);
  const purchaseNumber = await getNextSequenceNumber(schemaName, 'purchase');

  // Insert purchase header
  const { data: purchase, error: purchaseError } = await client
    .from('purchases')
    .insert({
      purchase_number: purchaseNumber,
      location_id: input.location_id,
      contact_id: input.contact_id ?? null,
      status: 'received',
      transporter_name: input.transporter_name || null,
      vehicle_number: input.vehicle_number || null,
      driver_name: input.driver_name || null,
      driver_phone: input.driver_phone || null,
      notes: input.notes || null,
      created_by: userId,
      received_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (purchaseError) throw new Error(`Failed to create purchase: ${purchaseError.message}`);

  // Insert purchase items
  const itemsToInsert = input.items.map((item) => ({
    purchase_id: purchase.id,
    commodity_id: item.commodity_id,
    unit_id: item.unit_id,
    quantity: item.quantity,
    bags: item.bags ?? null,
    unit_price: item.unit_price ?? null,
  }));

  const { error: itemsError } = await client
    .from('purchase_items')
    .insert(itemsToInsert);

  if (itemsError) throw new Error(`Failed to create purchase items: ${itemsError.message}`);

  return purchase as Purchase;
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
