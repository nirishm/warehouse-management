import { NextRequest, NextResponse } from 'next/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { TenantContext } from './types';
import { ALL_PERMISSIONS, getAdminPermissions, Permission } from './permissions';
import { PermissionError, ModuleDisabledError } from '@/core/errors';
import { handleApiError } from '@/core/api/error-handler';

export async function withTenantContext(
  request: NextRequest,
  handler: (ctx: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Trust middleware-set headers (Next.js replaces them server-side — cannot be forged)
    const tenantId = request.headers.get('x-tenant-id');
    const schemaName = request.headers.get('x-tenant-schema');
    const role = request.headers.get('x-tenant-role') as TenantContext['role'];
    const enabledModules: string[] = JSON.parse(request.headers.get('x-tenant-modules') || '[]');
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email') ?? '';

    if (!tenantId || !schemaName || !userId || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantSlug = request.nextUrl.pathname.match(/\/api\/t\/([^/]+)/)?.[1] ?? '';
    const tenantClient = createTenantClient(schemaName);

    let permissions: Record<Permission, boolean>;
    let userName: string;
    let allowedLocationIds: string[] | null = null;

    if (role === 'tenant_admin') {
      // Admin gets all permissions — only need display_name
      permissions = getAdminPermissions();
      const { data: profile } = await tenantClient
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single();
      userName = profile?.display_name ?? userEmail ?? userId;
    } else {
      // Non-admin: fetch permissions + locations in parallel
      const [profileResult, locationsResult] = await Promise.all([
        tenantClient
          .from('user_profiles')
          .select('permissions, display_name')
          .eq('user_id', userId)
          .single(),
        tenantClient
          .from('user_locations')
          .select('location_id')
          .eq('user_id', userId),
      ]);

      permissions = (profileResult.data?.permissions ?? {}) as Record<Permission, boolean>;
      userName = profileResult.data?.display_name ?? userEmail ?? userId;
      allowedLocationIds = (locationsResult.data ?? []).map(
        (l: { location_id: string }) => l.location_id
      );
    }

    return handler({
      tenantId, tenantSlug, schemaName, role, enabledModules,
      userId, userName, permissions, allowedLocationIds,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export function requirePermission(ctx: TenantContext, permission: Permission): void {
  if (ctx.role === 'tenant_admin') return;
  if (!ctx.permissions[permission]) {
    throw new PermissionError(permission);
  }
}

export function requireModule(ctx: TenantContext, moduleId: string): void {
  if (!ctx.enabledModules.includes(moduleId)) {
    throw new ModuleDisabledError(moduleId);
  }
}

export function requireLocationAccess(ctx: TenantContext, locationId: string): void {
  if (ctx.allowedLocationIds === null) return;
  if (!ctx.allowedLocationIds.includes(locationId)) {
    throw new PermissionError('location access');
  }
}
