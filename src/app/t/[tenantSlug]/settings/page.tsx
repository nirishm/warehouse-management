import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { moduleRegistry } from '@/core/modules/registry';
import '@/modules'; // Register all modules
import { SettingsClient } from './settings-client';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantSettingsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, adminOnly: true });
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;

  // Resolve user role
  const { data: membership } = await supabase
    .from('user_tenants')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single();

  const role = (membership?.role ?? 'employee') as 'tenant_admin' | 'manager' | 'employee';

  // Get all registered modules for display
  const allModules = moduleRegistry.getAll().map((mod) => ({
    id: mod.id,
    name: mod.name,
    description: mod.description,
    icon: mod.icon,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
          Tenant Settings
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Manage your organization info, modules, and preferences
        </p>
      </div>

      <SettingsClient
        tenant={{
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
          enabled_modules: tenant.enabled_modules ?? [],
          created_at: tenant.created_at,
        }}
        allModules={allModules}
        role={role}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
