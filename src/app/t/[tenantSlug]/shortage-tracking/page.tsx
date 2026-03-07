import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import {
  getShortageOverview,
  getShortageByRoute,
  getShortageByTransporter,
  getShortageByCommodity,
  getRecentShortages,
} from '@/modules/shortage-tracking/queries/shortages';
import { ShortageDashboard } from './shortage-dashboard';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ShortageTrackingPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const [overview, byRoute, byTransporter, byCommodity, recent] =
    await Promise.all([
      getShortageOverview(tenant.schema_name),
      getShortageByRoute(tenant.schema_name),
      getShortageByTransporter(tenant.schema_name),
      getShortageByCommodity(tenant.schema_name),
      getRecentShortages(tenant.schema_name),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
          Shortage Tracking
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Analyze dispatch shortages across routes, transporters, and
          commodities
        </p>
      </div>

      <ShortageDashboard
        overview={overview}
        byRoute={byRoute}
        byTransporter={byTransporter}
        byCommodity={byCommodity}
        recent={recent}
      />
    </div>
  );
}
