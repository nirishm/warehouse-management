import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyModuleMigration } from '@/core/db/module-migrations';
import { withSuperAdmin } from '@/core/auth/admin-guard';
import { moduleRegistry } from '@/core/modules/registry';
// Import manifests so migrations register as side effects
import '@/modules/index';

const tenantPatchSchema = z.object({
  name: z.string().min(1).optional(),
  enabled_modules: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
}).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSuperAdmin(request, async () => {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: tenant, error } = await admin
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ tenant });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSuperAdmin(request, async () => {
    const { id } = await params;
    const body = await request.json();

    const parsed = tenantPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const migrationErrors: string[] = [];

    // If enabled_modules is being updated, run migrations for newly added modules
    if (Array.isArray(parsed.data.enabled_modules)) {
      const { data: existing } = await admin
        .from('tenants')
        .select('enabled_modules, schema_name')
        .eq('id', id)
        .single();

      if (existing) {
        const prev: string[] = existing.enabled_modules ?? [];
        const next: string[] = parsed.data.enabled_modules;
        const newlyEnabled = next.filter((m) => !prev.includes(m));

        // Check dependencies for newly enabled modules
        for (const moduleId of newlyEnabled) {
          const manifest = moduleRegistry.get(moduleId);
          if (manifest) {
            const missingDeps = manifest.dependencies.filter(
              (dep) => !next.includes(dep)
            );
            if (missingDeps.length > 0) {
              return NextResponse.json(
                { error: `Module "${moduleId}" requires: ${missingDeps.join(', ')}` },
                { status: 400 }
              );
            }
          }
        }

        for (const moduleId of newlyEnabled) {
          try {
            await applyModuleMigration(moduleId, existing.schema_name);
          } catch (migErr) {
            migrationErrors.push(moduleId);
            console.error(`Migration failed for module ${moduleId}:`, migErr);
          }
        }
        // Remove failed modules from the update payload
        if (migrationErrors.length > 0) {
          parsed.data.enabled_modules = (parsed.data.enabled_modules ?? []).filter(
            (m: string) => !migrationErrors.includes(m) || prev.includes(m)
          );
        }
      }
    }

    const { data: tenant, error } = await admin
      .from('tenants')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const response: Record<string, unknown> = { tenant };
    if (migrationErrors.length > 0) {
      response.migrationErrors = migrationErrors;
    }
    return NextResponse.json(response);
  });
}
