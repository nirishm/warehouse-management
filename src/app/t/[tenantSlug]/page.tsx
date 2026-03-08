import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
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
import type { DashboardFilters } from '@/modules/analytics/queries/dashboard';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TenantDashboard({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const sp = await searchParams;

  const supabase = await createServerSupabaseClient();

  // Resolve tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, schema_name, name, slug, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  // Resolve current user + location scope
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const tenantClient = createTenantClient(tenant.schema_name);

  const { data: membership } = await supabase
    .from('user_tenants')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single();

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
