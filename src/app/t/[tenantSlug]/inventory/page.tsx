import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getStockLevels,
  getLocationsForFilter,
  getCommoditiesForFilter,
} from '@/modules/inventory/queries/stock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockTable } from './stock-table';
import { RealtimeListener } from '@/components/realtime/realtime-listener';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ locationId?: string; commodityId?: string }>;
}

export default async function StockLevelsPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const filters = await searchParams;

  const supabase = await createServerSupabaseClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const [stockLevels, locations, commodities] = await Promise.all([
    getStockLevels(tenant.schema_name, {
      locationId: filters.locationId,
      commodityId: filters.commodityId,
    }),
    getLocationsForFilter(tenant.schema_name),
    getCommoditiesForFilter(tenant.schema_name),
  ]);

  const distinctCommodities = new Set(
    stockLevels
      .filter((s) => s.current_stock !== 0)
      .map((s) => s.commodity_id)
  ).size;

  const distinctLocations = new Set(
    stockLevels
      .filter((s) => s.current_stock !== 0)
      .map((s) => s.location_id)
  ).size;

  const inTransitCount = stockLevels.filter((s) => s.in_transit > 0).length;

  const summaryStats = [
    { label: 'Commodities in Stock', value: distinctCommodities },
    { label: 'Active Locations', value: distinctLocations },
    { label: 'Items in Transit', value: inTransitCount },
  ];

  return (
    <div className="space-y-6">
      <RealtimeListener table="dispatches" />
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
          Stock Levels
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Current inventory across all locations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="border-border bg-[var(--bg-off)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground font-mono">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <StockTable
        stockLevels={stockLevels}
        locations={locations}
        commodities={commodities}
        activeLocationId={filters.locationId}
        activeCommodityId={filters.commodityId}
      />
    </div>
  );
}
