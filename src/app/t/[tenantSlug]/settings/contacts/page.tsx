import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { createTenantClient } from '@/core/db/tenant-query';
import { ContactsTable } from './contacts-table';

export default async function ContactsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, permission: 'canManageContacts' });

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error('Tenant not found');

  const client = createTenantClient(tenant.schema_name);
  const { data: contacts } = await client
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  return (
    <div className="space-y-6">
      <ContactsTable data={contacts ?? []} tenantSlug={tenantSlug} />
    </div>
  );
}
