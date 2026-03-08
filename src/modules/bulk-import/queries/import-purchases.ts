import { createTenantClient, getNextSequenceNumber } from '@/core/db/tenant-query';
import type { PurchaseRow } from '../schemas/purchases-csv';
import type { ImportResult } from './import-commodities';

export async function importPurchases(
  schemaName: string,
  rows: PurchaseRow[],
  parseErrors: { row: number; field: string; message: string }[],
  userId: string
): Promise<ImportResult> {
  const client = createTenantClient(schemaName);
  let inserted = 0;
  const errors = [...parseErrors];

  // Pre-fetch lookup maps
  const [{ data: locations }, { data: commodities }, { data: units }] = await Promise.all([
    client.from('locations').select('id,code').is('deleted_at', null),
    client.from('commodities').select('id,code').is('deleted_at', null),
    client.from('units').select('id,name,abbreviation').is('deleted_at', null),
  ]);

  const locationMap = new Map((locations ?? []).map((l) => [l.code.toLowerCase(), l.id]));
  const commodityMap = new Map((commodities ?? []).map((c) => [c.code.toLowerCase(), c.id]));
  const unitMap = new Map(
    (units ?? []).flatMap((u) => [
      [u.abbreviation?.toLowerCase(), u.id],
      [u.name.toLowerCase(), u.id],
    ]).filter(([k]) => !!k) as [string, string][]
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const locationId = locationMap.get(row.location_code.toLowerCase());
    if (!locationId) {
      errors.push({ row: rowNum, field: 'location_code', message: `Location '${row.location_code}' not found` });
      continue;
    }

    const commodityId = commodityMap.get(row.commodity_code.toLowerCase());
    if (!commodityId) {
      errors.push({ row: rowNum, field: 'commodity_code', message: `Commodity '${row.commodity_code}' not found` });
      continue;
    }

    const unitId = row.unit_abbreviation
      ? unitMap.get(row.unit_abbreviation.toLowerCase())
      : undefined;

    try {
      const purchaseNumber = await getNextSequenceNumber(schemaName, 'purchase');
      const { data: purchase, error: purchaseErr } = await client
        .from('purchases')
        .insert({
          purchase_number: purchaseNumber,
          location_id: locationId,
          status: 'received',
          notes: row.notes || null,
          received_at: new Date().toISOString(),
          created_by: userId,
        })
        .select('id')
        .single();

      if (purchaseErr) {
        errors.push({ row: rowNum, field: '_row', message: purchaseErr.message });
        continue;
      }

      const { error: itemErr } = await client.from('purchase_items').insert({
        purchase_id: purchase.id,
        commodity_id: commodityId,
        unit_id: unitId ?? null,
        quantity: Number(row.quantity),
        bags: row.bags ? Number(row.bags) : null,
      });

      if (itemErr) {
        errors.push({ row: rowNum, field: '_row', message: itemErr.message });
      } else {
        inserted++;
      }
    } catch (e) {
      errors.push({ row: rowNum, field: '_row', message: String(e) });
    }
  }

  return { summary: { total: rows.length, inserted, failed: rows.length - inserted }, errors };
}
