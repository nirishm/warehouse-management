import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule } from '@/core/auth/guards';
import { listUsers } from '@/modules/user-management/queries/users';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTenantClient } from '@/core/db/tenant-query';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'user-management');

    if (ctx.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await listUsers(ctx.schemaName, ctx.tenantId);
    return NextResponse.json({ data: users });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'user-management');

    if (ctx.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, fullName, role } = body;

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const assignedRole = role === 'tenant_admin' ? 'tenant_admin' : 'employee';
    const admin = createAdminClient();

    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName || email.split('@')[0] },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/set-password`,
    });

    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

    const newUserId = inviteData.user.id;

    // Create user_tenants record
    const { error: memberError } = await admin
      .from('user_tenants')
      .insert({
        user_id: newUserId,
        tenant_id: ctx.tenantId,
        role: assignedRole,
        is_default: true,
      });

    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

    // Create user profile in tenant schema
    const isAdmin = assignedRole === 'tenant_admin';
    const tenantClient = createTenantClient(ctx.schemaName);
    const { error: profileError } = await tenantClient
      .from('user_profiles')
      .insert({
        user_id: newUserId,
        display_name: fullName || email.split('@')[0],
        permissions: {
          canPurchase: isAdmin, canDispatch: isAdmin, canReceive: isAdmin, canSale: isAdmin,
          canViewStock: true, canManageLocations: isAdmin, canManageCommodities: isAdmin,
          canManageContacts: isAdmin, canViewAnalytics: isAdmin, canExportData: isAdmin,
          canViewAuditLog: isAdmin, canManagePayments: isAdmin, canManageAlerts: isAdmin,
          canGenerateDocuments: isAdmin, canManageLots: isAdmin, canManageReturns: isAdmin,
          canImportData: isAdmin,
        },
      });

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    return NextResponse.json({ userId: newUserId, email }, { status: 201 });
  });
}
