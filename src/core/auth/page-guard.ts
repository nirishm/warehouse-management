import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import type { Permission } from './types';

interface PageGuardOptions {
  tenantSlug: string;
  /** Module that must be enabled (e.g. 'purchase', 'dispatch') */
  moduleId?: string;
  /** Permission required (e.g. 'canPurchase'). Tenant admins always pass. */
  permission?: Permission;
  /** If true, only tenant_admin can access (e.g. settings pages) */
  adminOnly?: boolean;
}

/**
 * Server-side page guard. Call at the top of any page.tsx to enforce
 * module + permission checks. Redirects to dashboard if unauthorized.
 */
export async function requirePageAccess({
  tenantSlug,
  moduleId,
  permission,
  adminOnly,
}: PageGuardOptions): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .eq('status', 'active')
    .single();

  if (!tenant) redirect('/');

  const { data: membership } = await supabase
    .from('user_tenants')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single();

  if (!membership) redirect('/');

  const role = membership.role;

  // Admin-only pages
  if (adminOnly && role !== 'tenant_admin') {
    redirect(`/t/${tenantSlug}`);
  }

  // Module check
  if (moduleId && !tenant.enabled_modules?.includes(moduleId)) {
    redirect(`/t/${tenantSlug}`);
  }

  // Permission check (tenant_admin bypasses)
  if (permission && role !== 'tenant_admin') {
    const tenantClient = createTenantClient(tenant.schema_name);
    const { data: profile } = await tenantClient
      .from('user_profiles')
      .select('permissions')
      .eq('user_id', user.id)
      .single();

    const permissions = (profile?.permissions ?? {}) as Record<string, boolean>;
    if (!permissions[permission]) {
      redirect(`/t/${tenantSlug}`);
    }
  }
}
