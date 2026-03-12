import { db } from '@/core/db/drizzle';
import { queryStockLevels, type StockLevel } from '@/core/db/stock-levels';

export type { StockLevel };

/**
 * Thin wrapper around queryStockLevels for use in the inventory module.
 */
export async function getStockLevels(
  tenantId: string,
  filters?: {
    itemId?: string;
    locationId?: string;
  },
): Promise<StockLevel[]> {
  return queryStockLevels(db, tenantId, filters);
}
