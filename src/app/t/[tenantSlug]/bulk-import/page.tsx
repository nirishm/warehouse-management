import { redirect } from 'next/navigation';
import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { BulkImportTabs } from './bulk-import-tabs';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function BulkImportPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'bulk-import', permission: 'canImportData' });

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('bulk-import')) redirect(`/t/${tenantSlug}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">Import / Export</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Bulk import items, contacts, and initial stock via CSV
        </p>
      </div>
      <BulkImportTabs tenantSlug={tenantSlug} />
    </div>
  );
}
