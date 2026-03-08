import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTenantClient } from '@/core/db/tenant-query';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Verify caller is super admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!superAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { email, fullName } = body;

  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  // Get tenant
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, schema_name, slug')
    .eq('id', id)
    .single();

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Create auth user via admin API (invite)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName || email.split('@')[0] },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/set-password`,
  });

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

  const newUserId = inviteData.user.id;

  // Create user_tenants record as tenant_admin
  const { error: memberError } = await admin
    .from('user_tenants')
    .insert({
      user_id: newUserId,
      tenant_id: tenant.id,
      role: 'tenant_admin',
      is_default: true,
    });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  // Create user profile in tenant schema
  const tenantClient = createTenantClient(tenant.schema_name);
  await tenantClient
    .from('user_profiles')
    .insert({
      user_id: newUserId,
      display_name: fullName || email.split('@')[0],
      permissions: {
        canPurchase: true, canDispatch: true, canReceive: true, canSale: true,
        canViewStock: true, canManageLocations: true, canManageCommodities: true,
        canManageContacts: true, canViewAnalytics: true, canExportData: true,
        canViewAuditLog: true,
      },
    });

  return NextResponse.json({ userId: newUserId, email }, { status: 201 });
}
