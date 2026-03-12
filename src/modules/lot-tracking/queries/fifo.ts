import { execSql } from '@/core/db/exec-sql';
import { validateSchemaName, validateUUID } from '@/core/db/validate-schema';
import type { LotStockLevel } from '../validations/lot';

/**
 * Returns available lots for a commodity+location in FIFO order (oldest first).
 * Used by dispatch and sale forms to suggest which lots to consume from.
 */
export async function getFIFOLotsForAllocation(
  schemaName: string,
  commodityId: string
): Promise<LotStockLevel[]> {
  validateSchemaName(schemaName);
  validateUUID(commodityId, 'commodity ID');
  const data = await execSql<Record<string, unknown>>(`
      SELECT lot_id, lot_number, commodity_id, unit_id,
             received_date, expiry_date, initial_quantity, current_quantity
      FROM "${schemaName}".lot_stock_levels
      WHERE commodity_id = '${commodityId}'
        AND current_quantity > 0
        AND (expiry_date IS NULL OR expiry_date > NOW())
      ORDER BY received_date ASC
    `);

  return data.map((row: Record<string, unknown>) => ({
    lot_id: row.lot_id as string,
    lot_number: row.lot_number as string,
    commodity_id: row.commodity_id as string,
    unit_id: row.unit_id as string,
    received_date: row.received_date as string,
    expiry_date: (row.expiry_date as string) ?? null,
    initial_quantity: Number(row.initial_quantity),
    current_quantity: Number(row.current_quantity),
  }));
}

/**
 * Auto-allocates lots FIFO-style for a given commodity + required quantity.
 * Returns allocation plan: [{lot_id, lot_number, quantity_to_use}]
 */
export async function buildFIFOAllocation(
  schemaName: string,
  commodityId: string,
  requiredQuantity: number
): Promise<{ lot_id: string; lot_number: string; quantity: number }[]> {
  const lots = await getFIFOLotsForAllocation(schemaName, commodityId);
  const allocation: { lot_id: string; lot_number: string; quantity: number }[] = [];
  let remaining = requiredQuantity;

  for (const lot of lots) {
    if (remaining <= 0) break;
    const use = Math.min(lot.current_quantity, remaining);
    allocation.push({ lot_id: lot.lot_id, lot_number: lot.lot_number, quantity: use });
    remaining -= use;
  }

  return allocation;
}
