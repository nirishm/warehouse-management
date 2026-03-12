import { redirect } from 'next/navigation';
import { createTenantClient } from '@/core/db/tenant-query';
import { getCurrentUser, getTenantBySlug, getMembership } from '@/core/auth/session';
import { moduleRegistry } from '@/core/modules/registry';
import '@/modules'; // Register all modules
import { TenantProvider } from '@/components/layout/tenant-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import type { TenantContext, Permission } from '@/core/auth/types';

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantLayout({ children, params }: Props) {
  const { tenantSlug } = await params;

  // Fetch user + tenant in parallel via request-scoped cache
  const [user, tenant] = await Promise.all([
    getCurrentUser(),
    getTenantBySlug(tenantSlug),
  ]);

  if (!user) redirect('/login');
  if (!tenant) redirect('/');

  // Check membership + load permissions in parallel
  const tenantClient = createTenantClient(tenant.schema_name);
  const [membership, { data: profile }] = await Promise.all([
    getMembership(user.id, tenant.id),
    tenantClient
      .from('user_profiles')
      .select('permissions, display_name')
      .eq('user_id', user.id)
      .single(),
  ]);

  if (!membership) redirect('/');

  const role = membership.role as TenantContext['role'];
  const permissions = (profile?.permissions ?? {}) as Record<Permission, boolean>;
  const userName = profile?.display_name ?? user.email ?? user.id;

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
    tenantSlug,
    schemaName: tenant.schema_name,
    role,
    enabledModules: tenant.enabled_modules || [],
    userId: user.id,
    userName,
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
          <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
        <MobileBottomNav tenantSlug={tenantSlug} tenantName={tenant.name} navItems={navItems} />
      </div>
    </TenantProvider>
  );
}
