import { redirect } from 'next/navigation';
import { createTenantClient } from '@/core/db/tenant-query';
import { getCurrentUser, getTenantBySlug, getMembership } from './session';
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
 *
 * Uses request-scoped cache() so tenant/user lookups are deduplicated
 * when the page component also calls getTenantBySlug / getCurrentUser.
 */
export async function requirePageAccess({
  tenantSlug,
  moduleId,
  permission,
  adminOnly,
}: PageGuardOptions): Promise<void> {
  // Fetch user + tenant in parallel (both are independently cacheable)
  const [user, tenant] = await Promise.all([
    getCurrentUser(),
    getTenantBySlug(tenantSlug),
  ]);

  if (!user) redirect('/login');
  if (!tenant) redirect('/');

  const membership = await getMembership(user.id, tenant.id);
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
