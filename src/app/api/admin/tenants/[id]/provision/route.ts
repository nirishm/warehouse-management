import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { provisionTenantSchema } from '@/core/db/tenant-provisioning';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
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
}
