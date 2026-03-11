import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { createTenantClient } from '@/core/db/tenant-query';
import { listThresholds } from '@/modules/stock-alerts/queries/alerts';
import { ThresholdsManager } from './thresholds-manager';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ThresholdsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'stock-alerts', permission: 'canManageAlerts' });

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('stock-alerts')) redirect(`/t/${tenantSlug}`);

  const tenantClient = createTenantClient(tenant.schema_name);

  const [thresholds, commoditiesResult, locationsResult, unitsResult] = await Promise.all([
    listThresholds(tenant.schema_name),
    tenantClient.from('commodities').select('id, name, code').is('deleted_at', null).order('name'),
    tenantClient.from('locations').select('id, name').is('deleted_at', null).order('name'),
    tenantClient.from('units').select('id, name, abbreviation').order('name'),
  ]);

  return (
    <ThresholdsManager
      tenantSlug={tenantSlug}
      initialThresholds={thresholds}
      commodities={commoditiesResult.data ?? []}
      locations={locationsResult.data ?? []}
      units={unitsResult.data ?? []}
    />
  );
}
