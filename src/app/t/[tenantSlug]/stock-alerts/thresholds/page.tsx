import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { listThresholds } from '@/modules/stock-alerts/queries/alerts';
import { ThresholdsManager } from './thresholds-manager';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ThresholdsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

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
