import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertSummaryWidget } from '@/components/stock-alerts/alert-summary-widget';
import { getAlertSummary } from '@/modules/stock-alerts/queries/alerts';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantDashboard({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);

  const stockAlertsEnabled = tenant.enabled_modules?.includes('stock-alerts') ?? false;

  const [locationResult, commodityResult, alertSummary] = await Promise.all([
    tenantClient
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),
    tenantClient
      .from('commodities')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),
    stockAlertsEnabled ? getAlertSummary(tenant.schema_name) : null,
  ]);

  const locationCount = locationResult.count;
  const commodityCount = commodityResult.count;

  const stats = [
    { label: 'Locations', value: locationCount ?? 0 },
    { label: 'Commodities', value: commodityCount ?? 0 },
    { label: 'Active Modules', value: tenant.enabled_modules?.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome to {tenant.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-[var(--bg-off)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground font-mono">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {alertSummary && alertSummary.total > 0 && (
        <AlertSummaryWidget summary={alertSummary} tenantSlug={tenantSlug} />
      )}
    </div>
  );
}
