import { db } from '@/core/db/drizzle';
import { queryStockLevels, type StockLevel } from '@/core/db/stock-levels';
import type { LocationScope } from '@/core/db/location-scope';

export type { StockLevel };

/**
 * Thin wrapper around queryStockLevels for use in the inventory module.
 */
export async function getStockLevels(
  tenantId: string,
  filters?: {
    itemId?: string;
    locationId?: string;
    locationScope?: LocationScope;
  },
): Promise<StockLevel[]> {
  if (filters?.locationScope !== undefined && filters.locationScope !== null
      && filters.locationScope.length === 0) {
    return [];
  }

  return queryStockLevels(db, tenantId, {
    itemId: filters?.itemId,
    locationId: filters?.locationId,
    ...(filters?.locationScope ? { locationIds: filters.locationScope } : {}),
  });
}
