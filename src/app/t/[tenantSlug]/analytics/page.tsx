import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import {
  getOverviewStats,
  getDispatchAnalytics,
  getMovementSummary,
} from '@/modules/analytics/queries/analytics';
import { AnalyticsDashboard } from './analytics-dashboard';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AnalyticsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'analytics', permission: 'canViewAnalytics' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  // Verify the tenant client can connect (validates schema)
  createTenantClient(tenant.schema_name);

  const [overview, dispatches, movements] = await Promise.all([
    getOverviewStats(tenant.schema_name),
    getDispatchAnalytics(tenant.schema_name),
    getMovementSummary(tenant.schema_name),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
          Analytics
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Warehouse performance overview for {tenant.name}
        </p>
      </div>

      <AnalyticsDashboard
        overview={overview}
        dispatches={dispatches}
        movements={movements}
      />
    </div>
  );
}
