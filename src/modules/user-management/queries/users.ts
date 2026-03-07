import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  UpdateUserProfileInput,
  UserProfile,
  UserWithRole,
  UserWithLocations,
} from '../validations/user';

export async function listUsers(
  schemaName: string,
  tenantId: string
): Promise<UserWithRole[]> {
  const tenantClient = createTenantClient(schemaName);
  const { data: profiles, error: profilesError } = await tenantClient
    .from('user_profiles')
    .select('*')
    .order('display_name');

  if (profilesError) throw new Error(`Failed to list user profiles: ${profilesError.message}`);

  const publicClient = createAdminClient();
  const { data: memberships, error: membershipsError } = await publicClient
    .from('user_tenants')
    .select('user_id, role')
    .eq('tenant_id', tenantId);

  if (membershipsError) throw new Error(`Failed to list user memberships: ${membershipsError.message}`);

  const roleMap = new Map<string, string>();
  for (const m of memberships ?? []) {
    roleMap.set(m.user_id, m.role);
  }

  return ((profiles ?? []) as UserProfile[]).map((profile) => ({
    ...profile,
    role: (roleMap.get(profile.user_id) ?? 'employee') as UserWithRole['role'],
  }));
}

export async function getUserById(
  schemaName: string,
  tenantId: string,
  userId: string
): Promise<UserWithLocations | null> {
  const tenantClient = createTenantClient(schemaName);

  const { data: profile, error: profileError } = await tenantClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    if (profileError.code === 'PGRST116') return null;
    throw new Error(`Failed to get user profile: ${profileError.message}`);
  }

  const { data: locations, error: locationsError } = await tenantClient
    .from('user_locations')
    .select('id, user_id, location_id')
    .eq('user_id', userId);

  if (locationsError) throw new Error(`Failed to get user locations: ${locationsError.message}`);

  const publicClient = createAdminClient();
  const { data: membership } = await publicClient
    .from('user_tenants')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .single();

  return {
    ...(profile as UserProfile),
    role: (membership?.role ?? 'employee') as UserWithLocations['role'],
    locations: (locations ?? []) as { id: string; user_id: string; location_id: string }[],
  };
}

export async function updateUserProfile(
  schemaName: string,
  userId: string,
  data: UpdateUserProfileInput
): Promise<UserProfile> {
  const client = createTenantClient(schemaName);

  const updateData: Record<string, unknown> = {};
  if (data.display_name !== undefined) updateData.display_name = data.display_name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.permissions !== undefined) updateData.permissions = data.permissions;
  updateData.updated_at = new Date().toISOString();

  const { data: updated, error } = await client
    .from('user_profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update user profile: ${error.message}`);
  return updated as UserProfile;
}

export async function updateUserLocations(
  schemaName: string,
  userId: string,
  locationIds: string[]
): Promise<void> {
  const client = createTenantClient(schemaName);

  const { error: deleteError } = await client
    .from('user_locations')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw new Error(`Failed to clear user locations: ${deleteError.message}`);

  if (locationIds.length > 0) {
    const rows = locationIds.map((locationId) => ({
      user_id: userId,
      location_id: locationId,
    }));

    const { error: insertError } = await client
      .from('user_locations')
      .insert(rows);

    if (insertError) throw new Error(`Failed to assign user locations: ${insertError.message}`);
  }
}
