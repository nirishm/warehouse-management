import { createTenantClient, getNextSequenceNumber } from '@/core/db/tenant-query';
import type {
  CreateAdjustmentInput,
  Adjustment,
  AdjustmentWithRelations,
  AdjustmentReason,
  CreateAdjustmentReasonInput,
} from '../validations/adjustment';

export async function listAdjustments(
  schemaName: string,
  options?: { allowedLocationIds?: string[] | null }
): Promise<AdjustmentWithRelations[]> {
  const client = createTenantClient(schemaName);
  let query = client
    .from('adjustments')
    .select(
      '*, location:locations(name), commodity:commodities(name, code), unit:units(name, abbreviation), reason:adjustment_reasons(name, direction)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const ids = options?.allowedLocationIds;
  if (ids !== null && ids !== undefined && ids.length > 0) {
    query = query.in('location_id', ids);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list adjustments: ${error.message}`);
  return (data ?? []) as unknown as AdjustmentWithRelations[];
}

export async function getAdjustmentById(
  schemaName: string,
  id: string
): Promise<AdjustmentWithRelations | null> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('adjustments')
    .select(
      '*, location:locations(name), commodity:commodities(name, code), unit:units(name, abbreviation), reason:adjustment_reasons(name, direction)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get adjustment: ${error.message}`);
  }

  return data as unknown as AdjustmentWithRelations;
}

export async function createAdjustment(
  schemaName: string,
  input: CreateAdjustmentInput,
  userId: string
): Promise<Adjustment> {
  const client = createTenantClient(schemaName);

  const adjustmentNumber = await getNextSequenceNumber(schemaName, 'adjustment');

  const { data, error } = await client
    .from('adjustments')
    .insert({
      adjustment_number: adjustmentNumber,
      location_id: input.location_id,
      commodity_id: input.commodity_id,
      unit_id: input.unit_id,
      reason_id: input.reason_id,
      quantity: input.quantity,
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create adjustment: ${error.message}`);
  return data as Adjustment;
}

export async function listAdjustmentReasons(
  schemaName: string
): Promise<AdjustmentReason[]> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('adjustment_reasons')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(`Failed to list adjustment reasons: ${error.message}`);
  return (data ?? []) as AdjustmentReason[];
}

export async function createAdjustmentReason(
  schemaName: string,
  input: CreateAdjustmentReasonInput
): Promise<AdjustmentReason> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('adjustment_reasons')
    .insert({
      name: input.name,
      direction: input.direction,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create adjustment reason: ${error.message}`);
  return data as AdjustmentReason;
}
