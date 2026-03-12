import { redirect } from 'next/navigation';
import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
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
  await requirePageAccess({ tenantSlug, moduleId: 'shortage_tracking', permission: 'canViewAnalytics' });

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect(`/t/${tenantSlug}`);

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
          items
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
