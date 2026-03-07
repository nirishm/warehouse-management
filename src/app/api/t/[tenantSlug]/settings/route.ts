import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateTenantSettingsSchema } from '@/modules/inventory/validations/tenant-settings';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    const admin = createAdminClient();

    const { data: tenant, error } = await admin
      .from('tenants')
      .select('id, name, slug, plan, status, enabled_modules, created_at')
      .eq('id', ctx.tenantId)
      .single();

    if (error || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        enabled_modules: tenant.enabled_modules ?? [],
        created_at: tenant.created_at,
      },
    });
  });
}

export async function PATCH(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    if (ctx.role !== 'tenant_admin') {
      return NextResponse.json(
        { error: 'Only tenant admins can update settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateTenantSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    if (!name) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: updated, error } = await admin
      .from('tenants')
      .update({ name })
      .eq('id', ctx.tenantId)
      .select('id, name, slug, plan, status, enabled_modules')
      .single();

    if (error) {
      console.error('Failed to update tenant settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        status: updated.status,
        enabled_modules: updated.enabled_modules ?? [],
      },
    });
  });
}
