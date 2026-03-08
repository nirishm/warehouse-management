import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTenantClient } from '@/core/db/tenant-query';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify super admin
  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!superAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { status, tenantId, role, notes } = body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get the access request
  const { data: accessRequest, error: fetchError } = await admin
    .from('access_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !accessRequest) {
    return NextResponse.json({ error: 'Access request not found' }, { status: 404 });
  }

  if (accessRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
  }

  if (status === 'approved') {
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required for approval' }, { status: 400 });
    }

    // Get tenant info
    const { data: tenant } = await admin
      .from('tenants')
      .select('id, schema_name, slug')
      .eq('id', tenantId)
      .single();

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const assignedRole = role === 'tenant_admin' ? 'tenant_admin' : 'employee';

    // Create user_tenants record
    const { error: memberError } = await admin
      .from('user_tenants')
      .insert({
        user_id: accessRequest.user_id,
        tenant_id: tenant.id,
        role: assignedRole,
        is_default: true,
      });

    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

    // Create user profile in tenant schema (same pattern as invite route)
    const isAdmin = assignedRole === 'tenant_admin';
    const tenantClient = createTenantClient(tenant.schema_name);
    const { error: profileError } = await tenantClient
      .from('user_profiles')
      .insert({
        user_id: accessRequest.user_id,
        display_name: accessRequest.full_name || accessRequest.email.split('@')[0],
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
  }

  // Update access request status
  const { error: updateError } = await admin
    .from('access_requests')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
