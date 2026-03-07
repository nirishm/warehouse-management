import { createTenantClient } from '@/core/db/tenant-query';
import type { CreateLocationInput, UpdateLocationInput, Location } from '../validations/location';

export async function listLocations(schemaName: string): Promise<Location[]> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('locations')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (error) throw new Error(`Failed to list locations: ${error.message}`);
  return (data ?? []) as Location[];
}

export async function getLocationById(
  schemaName: string,
  id: string
): Promise<Location | null> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('locations')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get location: ${error.message}`);
  }
  return data as Location;
}

export async function createLocation(
  schemaName: string,
  input: CreateLocationInput
): Promise<Location> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('locations')
    .insert({
      name: input.name,
      code: input.code,
      type: input.type,
      address: input.address ?? null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create location: ${error.message}`);
  return data as Location;
}

export async function updateLocation(
  schemaName: string,
  id: string,
  input: UpdateLocationInput & { is_active?: boolean }
): Promise<Location> {
  const client = createTenantClient(schemaName);

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.code !== undefined) updateData.code = input.code;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.address !== undefined) updateData.address = input.address;
  if ('is_active' in input) updateData.is_active = input.is_active;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('locations')
    .update(updateData)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update location: ${error.message}`);
  return data as Location;
}

export async function softDeleteLocation(
  schemaName: string,
  id: string
): Promise<void> {
  const client = createTenantClient(schemaName);
  const { error } = await client
    .from('locations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new Error(`Failed to delete location: ${error.message}`);
}
