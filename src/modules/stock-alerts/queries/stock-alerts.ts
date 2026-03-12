import { eq } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { alertThresholds } from '@/core/db/schema';
import { queryStockLevels } from '@/core/db/stock-levels';

export interface StockAlert {
  itemId: string;
  locationId: string | null;
  unitId: string | null;
  currentStock: number;
  minQuantity: number;
  deficit: number;
}

export async function getStockAlerts(tenantId: string): Promise<StockAlert[]> {
  const thresholds = await db
    .select()
    .from(alertThresholds)
    .where(eq(alertThresholds.tenantId, tenantId));

  if (thresholds.length === 0) return [];

  const stockLevels = await queryStockLevels(db, tenantId);

  const alerts: StockAlert[] = [];

  for (const threshold of thresholds) {
    const minQuantity = Number(threshold.minQuantity);

    const matching = stockLevels.filter((sl) => {
      const itemMatch = sl.itemId === threshold.itemId;
      const locationMatch = !threshold.locationId || sl.locationId === threshold.locationId;
      return itemMatch && locationMatch;
    });

    if (matching.length > 0) {
      for (const sl of matching) {
        if (sl.currentStock < minQuantity) {
          alerts.push({
            itemId: sl.itemId,
            locationId: sl.locationId,
            unitId: sl.unitId,
            currentStock: sl.currentStock,
            minQuantity,
            deficit: minQuantity - sl.currentStock,
          });
        }
      }
    } else if (minQuantity > 0) {
      // No stock levels found — treat as zero stock
      alerts.push({
        itemId: threshold.itemId,
        locationId: threshold.locationId ?? null,
        unitId: null,
        currentStock: 0,
        minQuantity,
        deficit: minQuantity,
      });
    }
  }

  return alerts;
}
