import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { provisionTenantSchema } from '@/core/db/tenant-provisioning';
import { withSuperAdmin } from '@/core/auth/admin-guard';

export async function GET(request: NextRequest) {
  return withSuperAdmin(request, async () => {
    const admin = createAdminClient();
    const { data: tenants, error } = await admin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tenants });
  });
}

export async function POST(request: NextRequest) {
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
  const { name, slug, plan } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug must be 3–50 lowercase alphanumeric characters and hyphens, starting and ending with a letter or number' },
      { status: 400 }
    );
  }

  const schemaName = `tenant_${slug.replace(/-/g, '_')}`;

  const admin = createAdminClient();
  const { data: tenant, error } = await admin
    .from('tenants')
    .insert({
      name,
      slug,
      schema_name: schemaName,
      plan: plan || 'free',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-provision the tenant schema so it's ready immediately
  try {
    await provisionTenantSchema(slug);
  } catch (provisionError) {
    // Roll back the tenant record if provisioning fails
    await admin.from('tenants').delete().eq('id', tenant.id);
    const message = provisionError instanceof Error ? provisionError.message : 'Schema provisioning failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ tenant }, { status: 201 });
}
