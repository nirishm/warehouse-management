import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  const { count: locationCount } = await tenantClient
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  const { count: commodityCount } = await tenantClient
    .from('commodities')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  const stats = [
    { label: 'Locations', value: locationCount ?? 0 },
    { label: 'Commodities', value: commodityCount ?? 0 },
    { label: 'Active Modules', value: tenant.enabled_modules?.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Welcome to {tenant.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-zinc-100 font-mono">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
