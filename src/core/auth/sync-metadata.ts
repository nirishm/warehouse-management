import { db } from '@/core/db/drizzle';
import { userTenants, tenants } from '@/core/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { eq, inArray } from 'drizzle-orm';
import type { Role } from './types';

interface MembershipRow {
  userId: string;
  tenantId: string;
  role: Role;
  isDefault: boolean;
}

interface TenantRow {
  id: string;
  slug: string;
  enabledModules: unknown;
}

/**
 * Pure function: builds the app_metadata object from DB rows.
 * Exported separately for unit testing without DB/Supabase dependencies.
 */
export function buildAppMetadata(
  memberships: MembershipRow[],
  tenantRows: TenantRow[],
) {
  if (memberships.length === 0) return null;

  const tenantMap = new Map(tenantRows.map((t) => [t.id, t]));

  // Primary tenant: first default, or first membership
  const primary =
    memberships.find((m) => m.isDefault) ?? memberships[0];
  const primaryTenant = tenantMap.get(primary.tenantId);

  if (!primaryTenant) return null;

  const enabledModules = Array.isArray(primaryTenant.enabledModules)
    ? (primaryTenant.enabledModules as string[])
    : [];

  return {
    tenant_id: primary.tenantId,
    tenant_slug: primaryTenant.slug,
    role: primary.role,
    enabled_modules: enabledModules,
    memberships: memberships.map((m) => ({
      tenantId: m.tenantId,
      slug: tenantMap.get(m.tenantId)?.slug ?? '',
      role: m.role,
    })),
  };
}

/**
 * Reads user_tenants + tenants from DB and updates the user's
 * Supabase Auth app_metadata so the JWT reflects current tenant access.
 *
 * Call this:
 * 1. After approving an access request
 * 2. On every login (auth callback) to catch stale metadata
 */
export async function syncUserAppMetadata(userId: string): Promise<void> {
  // Fetch all tenant memberships for this user
  const memberships = await db
    .select({
      userId: userTenants.userId,
      tenantId: userTenants.tenantId,
      role: userTenants.role,
      isDefault: userTenants.isDefault,
    })
    .from(userTenants)
    .where(eq(userTenants.userId, userId));

  if (memberships.length === 0) return;

  // Fetch tenant details for all memberships
  const tenantIds = memberships.map((m) => m.tenantId);
  const tenantRows = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      enabledModules: tenants.enabledModules,
    })
    .from(tenants)
    .where(inArray(tenants.id, tenantIds));

  const appMetadata = buildAppMetadata(memberships, tenantRows);
  if (!appMetadata) return;

  // Update Supabase Auth user's app_metadata
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: appMetadata,
  });
}
