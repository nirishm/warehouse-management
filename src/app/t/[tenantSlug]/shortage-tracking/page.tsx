import { redirect } from 'next/navigation';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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
  await requirePageAccess({ tenantSlug, moduleId: 'shortage-tracking', permission: 'canViewAnalytics' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('shortage_tracking')) redirect(`/t/${tenantSlug}`);

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
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
          Shortage Tracking
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Analyze dispatch shortages across routes, transporters, and
          commodities
        </p>
      </div>

      <ShortageDashboard
        tenantSlug={tenantSlug}
        overview={overview}
        byRoute={byRoute}
        byTransporter={byTransporter}
        byCommodity={byCommodity}
        recent={recent}
      />
    </div>
  );
}
