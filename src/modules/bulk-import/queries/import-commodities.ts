import { createTenantClient } from '@/core/db/tenant-query';
import type { CommodityRow } from '../schemas/commodities-csv';

export interface ImportResult {
  summary: { total: number; inserted: number; failed: number };
  errors: { row: number; field: string; message: string }[];
}

export async function importCommodities(
  schemaName: string,
  rows: CommodityRow[],
  parseErrors: { row: number; field: string; message: string }[]
): Promise<ImportResult> {
  const client = createTenantClient(schemaName);
  let inserted = 0;
  const errors = [...parseErrors];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    try {
      const { error } = await client
        .from('commodities')
        .insert({
          name: row.name,
          code: row.code,
          description: row.description || null,
          category: row.category || null,
        });
      if (error) {
        errors.push({ row: rowNum, field: 'code', message: error.message });
      } else {
        inserted++;
      }
    } catch (e) {
      errors.push({ row: rowNum, field: '_row', message: String(e) });
    }
  }

  return { summary: { total: rows.length, inserted, failed: rows.length - inserted }, errors };
}
