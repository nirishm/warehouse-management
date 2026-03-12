import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { provisionTenantSchema } from '@/core/db/tenant-provisioning';
import { withSuperAdmin } from '@/core/auth/admin-guard';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSuperAdmin(request, async () => {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: tenant } = await admin
      .from('tenants')
      .select('slug')
      .eq('id', id)
      .single();

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    try {
      const schemaName = await provisionTenantSchema(tenant.slug);
      return NextResponse.json({ schemaName });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Provisioning failed';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
