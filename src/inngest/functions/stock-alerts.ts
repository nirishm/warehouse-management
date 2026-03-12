import { inngest } from '@/inngest/client';
import { db } from '@/core/db/drizzle';
import { alertThresholds } from '@/core/db/schema';
import { queryStockLevels } from '@/core/db/stock-levels';
import { eq } from 'drizzle-orm';

export const checkStockAlerts = inngest.createFunction(
  { id: 'check-stock-alerts', name: 'Check Stock Alerts' },
  { cron: '*/5 * * * *' },
  async ({ step }) => {
    // Get all tenants with alert thresholds
    const tenantsWithAlerts = await step.run('get-tenants', async () => {
      const result = await db
        .selectDistinct({ tenantId: alertThresholds.tenantId })
        .from(alertThresholds);
      return result.map((r) => r.tenantId);
    });

    for (const tenantId of tenantsWithAlerts) {
      await step.run(`check-tenant-${tenantId}`, async () => {
        // Get thresholds for this tenant
        const thresholds = await db
          .select()
          .from(alertThresholds)
          .where(eq(alertThresholds.tenantId, tenantId));

        // Get stock levels
        const stockLevels = await queryStockLevels(db, tenantId);

        // Compare against thresholds
        const alerts: Array<{
          itemId: string;
          locationId: string;
          currentStock: number;
          threshold: number;
        }> = [];

        for (const threshold of thresholds) {
          const minQuantity = Number(threshold.minQuantity);

          const matching = stockLevels.filter((sl) => {
            const itemMatch = sl.itemId === threshold.itemId;
            const locationMatch =
              !threshold.locationId || sl.locationId === threshold.locationId;
            return itemMatch && locationMatch;
          });

          for (const sl of matching) {
            if (sl.currentStock < minQuantity) {
              alerts.push({
                itemId: sl.itemId,
                locationId: sl.locationId,
                currentStock: sl.currentStock,
                threshold: minQuantity,
              });
            }
          }

          // If no stock levels found for this item (meaning zero stock)
          if (matching.length === 0 && minQuantity > 0) {
            alerts.push({
              itemId: threshold.itemId,
              locationId: threshold.locationId ?? 'all',
              currentStock: 0,
              threshold: minQuantity,
            });
          }
        }

        // Emit events for each alert
        if (alerts.length > 0) {
          await inngest.send(
            alerts.map((a) => ({
              name: 'stock/below-threshold' as const,
              data: {
                tenantId,
                itemId: a.itemId,
                locationId: a.locationId,
                current: a.currentStock,
                threshold: a.threshold,
              },
            })),
          );
        }

        return { tenantId, alertCount: alerts.length };
      });
    }

    return { tenantsChecked: tenantsWithAlerts.length };
  },
);
