/**
 * Request-scoped cached helpers using React cache().
 * Identical calls within the same server render share one DB round-trip.
 * This deduplicate queries across requirePageAccess + page components.
 */
import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getTenantBySlug = cache(async (slug: string) => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('tenants')
    .select('id, name, slug, schema_name, status, plan, enabled_modules, created_at')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();
  return data;
});

export const getMembership = cache(async (userId: string, tenantId: string) => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('user_tenants')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single();
  return data;
});
