import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyModuleMigration } from '@/core/db/module-migrations';
// Import manifests so migrations register as side effects
import '@/modules/index';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ tenant });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const admin = createAdminClient();

  // If enabled_modules is being updated, run migrations for newly added modules
  if (Array.isArray(body.enabled_modules)) {
    const { data: existing } = await admin
      .from('tenants')
      .select('enabled_modules, schema_name')
      .eq('id', id)
      .single();

    if (existing) {
      const prev: string[] = existing.enabled_modules ?? [];
      const next: string[] = body.enabled_modules;
      const newlyEnabled = next.filter((m) => !prev.includes(m));
      for (const moduleId of newlyEnabled) {
        try {
          await applyModuleMigration(moduleId, existing.schema_name);
        } catch (migErr) {
          console.error(`Migration failed for module ${moduleId}:`, migErr);
          // Don't block the enable — migration may already be applied
        }
      }
    }
  }

  const { data: tenant, error } = await admin
    .from('tenants')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenant });
}
