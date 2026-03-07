import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { TenantContext, Permission } from './types';

export async function withTenantContext(
  request: NextRequest,
  handler: (ctx: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const schemaName = request.headers.get('x-tenant-schema');
    const role = request.headers.get('x-tenant-role') as TenantContext['role'];
    const enabledModules = JSON.parse(request.headers.get('x-tenant-modules') || '[]');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!tenantId || !schemaName || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantClient = createTenantClient(schemaName);
    const { data: profile } = await tenantClient
      .from('user_profiles')
      .select('permissions')
      .eq('user_id', user.id)
      .single();

    const permissions = (profile?.permissions ?? {}) as Record<Permission, boolean>;

    if (role === 'tenant_admin') {
      Object.keys(permissions).forEach(k => {
        (permissions as Record<string, boolean>)[k] = true;
      });
    }

    return handler({
      tenantId, schemaName, role, enabledModules,
      userId: user.id, permissions,
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
