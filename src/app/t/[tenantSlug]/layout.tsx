import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { moduleRegistry } from '@/core/modules/registry';
import '@/modules'; // Register all modules
import { TenantProvider } from '@/components/layout/tenant-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import type { TenantContext, Permission } from '@/core/auth/types';

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, schema_name, status, enabled_modules')
    .eq('slug', tenantSlug)
    .eq('status', 'active')
    .single();

  if (!tenant) redirect('/');

  // Check membership
  const { data: membership } = await supabase
    .from('user_tenants')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single();

  if (!membership) redirect('/');

  // Load permissions
  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: profile } = await tenantClient
    .from('user_profiles')
    .select('permissions')
    .eq('user_id', user.id)
    .single();

  const role = membership.role as TenantContext['role'];
  const permissions = (profile?.permissions ?? {}) as Record<Permission, boolean>;

  if (role === 'tenant_admin') {
    Object.keys(permissions).forEach(k => {
      (permissions as Record<string, boolean>)[k] = true;
    });
  }

  let allowedLocationIds: string[] | null = null;
  if (role !== 'tenant_admin') {
    const { data: locs } = await tenantClient
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id);
    const ids = (locs ?? []).map((l: { location_id: string }) => l.location_id);
    allowedLocationIds = ids.length > 0 ? ids : null;
  }

  const ctx: TenantContext = {
    tenantId: tenant.id,
    schemaName: tenant.schema_name,
    role,
    enabledModules: tenant.enabled_modules || [],
    userId: user.id,
    permissions,
    allowedLocationIds,
  };

  const navItems = moduleRegistry.getNavItems(
    tenant.enabled_modules || [],
    permissions
  );

  return (
    <TenantProvider value={ctx}>
      <div className="flex min-h-screen bg-[var(--bg-off)]">
        <Sidebar
          tenantSlug={tenantSlug}
          tenantName={tenant.name}
          navItems={navItems}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header tenantSlug={tenantSlug} tenantName={tenant.name} navItems={navItems} />
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
