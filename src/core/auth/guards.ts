import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTenantClient } from '@/core/db/tenant-query';
import { TenantContext, Permission } from './types';

export async function withTenantContext(
  request: NextRequest,
  handler: (ctx: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const schemaName = request.headers.get('x-tenant-schema');
    const enabledModules = JSON.parse(request.headers.get('x-tenant-modules') || '[]');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!tenantId || !schemaName || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify actual DB membership — prevents header forgery
    const adminClient = createAdminClient();
    const { data: membership } = await adminClient
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const verifiedRole = membership.role as TenantContext['role'];

    const tenantClient = createTenantClient(schemaName);
    const { data: profile } = await tenantClient
      .from('user_profiles')
      .select('permissions, display_name')
      .eq('user_id', user.id)
      .single();

    const permissions = (profile?.permissions ?? {}) as Record<Permission, boolean>;
    const userName = profile?.display_name ?? user.email ?? user.id;

    const ALL_PERMISSIONS: Permission[] = [
      'canPurchase', 'canDispatch', 'canReceive', 'canSale',
      'canViewStock', 'canManageLocations', 'canManageCommodities',
      'canManageContacts', 'canViewAnalytics', 'canExportData',
      'canViewAuditLog', 'canManagePayments', 'canManageAlerts',
      'canGenerateDocuments', 'canManageLots', 'canManageReturns',
      'canImportData',
    ];

    if (verifiedRole === 'tenant_admin') {
      for (const p of ALL_PERMISSIONS) {
        permissions[p] = true;
      }
    }

    let allowedLocationIds: string[] | null = null;
    if (verifiedRole !== 'tenant_admin') {
      const { data: locs } = await tenantClient
        .from('user_locations')
        .select('location_id')
        .eq('user_id', user.id);
      allowedLocationIds = (locs ?? []).map((l: { location_id: string }) => l.location_id);
    }

    return handler({
      tenantId, schemaName, role: verifiedRole, enabledModules,
      userId: user.id, userName, permissions, allowedLocationIds,
    });
  } catch (error) {
    console.error('Tenant context error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export function requirePermission(ctx: TenantContext, permission: Permission): void {
  if (ctx.role === 'tenant_admin') return;
  if (!ctx.permissions[permission]) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export function requireModule(ctx: TenantContext, moduleId: string): void {
  if (!ctx.enabledModules.includes(moduleId)) {
    throw new Error(`Module not enabled: ${moduleId}`);
  }
}

export function requireLocationAccess(ctx: TenantContext, locationId: string): void {
  if (ctx.allowedLocationIds === null) return;
  if (!ctx.allowedLocationIds.includes(locationId)) {
    throw new Error('Access denied: location not assigned');
  }
}
