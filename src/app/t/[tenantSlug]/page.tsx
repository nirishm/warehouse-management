import { createTenantClient } from '@/core/db/tenant-query';
import { getCurrentUser, getTenantBySlug, getMembership } from '@/core/auth/session';
import {
  getDashboardKpis,
  getRecentTransactions,
  getStockByLocation,
  getShortageAlerts,
  getRecentActivity,
} from '@/modules/analytics/queries/dashboard';
import {
  getLocationsForFilter,
  getCommoditiesForFilter,
} from '@/modules/inventory/queries/stock';
import { DashboardHome } from './dashboard-home';
import { OnboardingWizard } from './onboarding-wizard';
import type { DashboardFilters } from '@/modules/analytics/queries/dashboard';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TenantDashboard({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const sp = await searchParams;

  // Resolve tenant + user in parallel via request-scoped cache
  const [user, tenant] = await Promise.all([
    getCurrentUser(),
    getTenantBySlug(tenantSlug),
  ]);

  if (!tenant || !user) return null;

  const tenantClient = createTenantClient(tenant.schema_name);

  const membership = await getMembership(user.id, tenant.id);

  let allowedLocationIds: string[] | null = null;
  if (membership?.role !== 'tenant_admin') {
    const { data: locs } = await tenantClient
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id);
    const ids = (locs ?? []).map((l: { location_id: string }) => l.location_id);
    allowedLocationIds = ids.length > 0 ? ids : null;
  }

  // Build filters from searchParams
  const filters: DashboardFilters = {
    dateFrom: typeof sp.dateFrom === 'string' ? sp.dateFrom : undefined,
    dateTo: typeof sp.dateTo === 'string' ? sp.dateTo : undefined,
    locationId: typeof sp.locationId === 'string' ? sp.locationId : undefined,
    commodityId: typeof sp.commodityId === 'string' ? sp.commodityId : undefined,
    allowedLocationIds,
  };

  // Fetch all dashboard data in parallel
  const [kpis, recentTransactions, stockByLocation, shortageAlerts, recentActivity, locations, commodities] =
    await Promise.all([
      getDashboardKpis(tenant.schema_name, filters),
      getRecentTransactions(tenant.schema_name, filters),
      getStockByLocation(tenant.schema_name, filters),
      getShortageAlerts(tenant.schema_name, filters),
      getRecentActivity(tenant.schema_name, filters),
      getLocationsForFilter(tenant.schema_name),
      getCommoditiesForFilter(tenant.schema_name),
    ]);

  // Show onboarding wizard for new tenant admins with no locations
  const needsOnboarding = membership?.role === 'tenant_admin' && locations.length === 0;
  if (needsOnboarding) {
    return (
      <OnboardingWizard
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        schemaName={tenant.schema_name}
      />
    );
  }

  // If user has location restrictions, filter the locations dropdown
  const filteredLocations = allowedLocationIds
    ? locations.filter((l) => allowedLocationIds!.includes(l.id))
    : locations;

  return (
    <DashboardHome
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
      kpis={kpis}
      recentTransactions={recentTransactions}
      stockByLocation={stockByLocation}
      shortageAlerts={shortageAlerts}
      recentActivity={recentActivity}
      locations={filteredLocations as { id: string; name: string; code: string }[]}
      commodities={commodities as { id: string; name: string; code: string }[]}
      activeFilters={{
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        locationId: filters.locationId,
        commodityId: filters.commodityId,
      }}
    />
  );
}
