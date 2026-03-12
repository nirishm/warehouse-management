import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { createTenantClient } from '@/core/db/tenant-query';
import { ItemsTable } from './items-table';

export default async function ItemsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, permission: 'canManageCommodities' });

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error('Tenant not found');

  const client = createTenantClient(tenant.schema_name);
  const { data: commodities } = await client
    .from('commodities')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  return (
    <div className="space-y-6">
      <ItemsTable data={commodities ?? []} tenantSlug={tenantSlug} />
    </div>
  );
}
