/**
 * stock_levels VIEW query helper.
 *
 * The VIEW is defined in SQL migration (not in Drizzle schema)
 * since Drizzle doesn't support CREATE VIEW. We query it with raw SQL
 * via the Drizzle `db.execute()` method, scoped by tenant_id.
 */
import { sql } from 'drizzle-orm';
import type { Database } from './drizzle';

export interface StockLevel {
  tenantId: string;
  itemId: string;
  locationId: string;
  unitId: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  inTransit: number;
}

export async function queryStockLevels(
  db: Database,
  tenantId: string,
  filters?: {
    itemId?: string;
    locationId?: string;
    locationIds?: string[];
  },
): Promise<StockLevel[]> {
  const conditions = [sql`tenant_id = ${tenantId}`];

  if (filters?.itemId) {
    conditions.push(sql`item_id = ${filters.itemId}`);
  }
  if (filters?.locationId) {
    conditions.push(sql`location_id = ${filters.locationId}`);
  }
  if (filters?.locationIds && filters.locationIds.length > 0) {
    const placeholders = filters.locationIds.map(id => sql`${id}`);
    conditions.push(sql`location_id IN (${sql.join(placeholders, sql`, `)})`);
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const rows = await db.execute(
    sql`SELECT tenant_id, item_id, location_id, unit_id,
               total_in, total_out, current_stock, in_transit
        FROM stock_levels
        WHERE ${whereClause}`,
  );

  return (rows as unknown as Record<string, unknown>[]).map((row) => ({
    tenantId: row.tenant_id as string,
    itemId: row.item_id as string,
    locationId: row.location_id as string,
    unitId: row.unit_id as string,
    totalIn: Number(row.total_in),
    totalOut: Number(row.total_out),
    currentStock: Number(row.current_stock),
    inTransit: Number(row.in_transit),
  }));
}
