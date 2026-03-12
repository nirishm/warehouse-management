import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug, getCurrentUser, getMembership } from '@/core/auth/session';
import { moduleRegistry } from '@/core/modules/registry';
import '@/modules'; // ensure all modules registered
import { SettingsPage } from './settings-page';

export default async function SettingsRoute({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, adminOnly: true });

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error('Tenant not found');

  const user = await getCurrentUser();
  const membership = user ? await getMembership(user.id, tenant.id) : null;

  const allModules = moduleRegistry.getAll().map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    icon: m.icon,
  }));

  return (
    <SettingsPage
      tenant={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        enabledModules: tenant.enabled_modules || [],
      }}
      role={membership?.role ?? 'employee'}
      allModules={allModules}
      tenantSlug={tenantSlug}
    />
  );
}
