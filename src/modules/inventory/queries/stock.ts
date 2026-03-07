import { createTenantClient } from '@/core/db/tenant-query';

export interface StockLevelRow {
  commodity_id: string;
  location_id: string;
  unit_id: string;
  total_in: number;
  total_out: number;
  current_stock: number;
  in_transit: number;
  location?: { id: string; name: string; code: string } | null;
  commodity?: { id: string; name: string; code: string } | null;
  unit?: { id: string; name: string; abbreviation: string } | null;
}

export interface StockFilters {
  locationId?: string;
  commodityId?: string;
}

export async function getStockLevels(
  schemaName: string,
  filters?: StockFilters
): Promise<StockLevelRow[]> {
  const client = createTenantClient(schemaName);

  let query = client.from('stock_levels').select('*');
  if (filters?.locationId) query = query.eq('location_id', filters.locationId);
  if (filters?.commodityId) query = query.eq('commodity_id', filters.commodityId);
  const { data: stockData, error } = await query;

  if (error) throw new Error(`Failed to fetch stock levels: ${error.message}`);

  const { data: locations } = await client
    .from('locations')
    .select('id, name, code')
    .is('deleted_at', null);

  const { data: commodities } = await client
    .from('commodities')
    .select('id, name, code')
    .is('deleted_at', null);

  const { data: units } = await client
    .from('units')
    .select('id, name, abbreviation');

  const locationMap = new Map(
    (locations ?? []).map((l: { id: string; name: string; code: string }) => [l.id, l])
  );
  const commodityMap = new Map(
    (commodities ?? []).map((c: { id: string; name: string; code: string }) => [c.id, c])
  );
  const unitMap = new Map(
    (units ?? []).map((u: { id: string; name: string; abbreviation: string }) => [u.id, u])
  );

  return (stockData ?? []).map((s) => ({
    commodity_id: s.commodity_id as string,
    location_id: s.location_id as string,
    unit_id: s.unit_id as string,
    total_in: Number(s.total_in),
    total_out: Number(s.total_out),
    current_stock: Number(s.current_stock),
    in_transit: Number(s.in_transit),
    location: locationMap.get(s.location_id as string) ?? null,
    commodity: commodityMap.get(s.commodity_id as string) ?? null,
    unit: unitMap.get(s.unit_id as string) ?? null,
  }));
}

export async function getLocationsForFilter(schemaName: string) {
  const client = createTenantClient(schemaName);
  const { data } = await client
    .from('locations')
    .select('id, name, code')
    .is('deleted_at', null)
    .order('name');
  return data ?? [];
}

export async function getCommoditiesForFilter(schemaName: string) {
  const client = createTenantClient(schemaName);
  const { data } = await client
    .from('commodities')
    .select('id, name, code')
    .is('deleted_at', null)
    .order('name');
  return data ?? [];
}
