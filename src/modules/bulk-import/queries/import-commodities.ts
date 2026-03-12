import { createTenantClient } from '@/core/db/tenant-query';
import type { CommodityRow } from '../schemas/commodities-csv';

export interface ImportResult {
  summary: { total: number; inserted: number; failed: number };
  errors: { row: number; field: string; message: string }[];
  warnings?: { row: number; field: string; message: string }[];
}

export async function importCommodities(
  schemaName: string,
  rows: CommodityRow[],
  parseErrors: { row: number; field: string; message: string }[]
): Promise<ImportResult> {
  const client = createTenantClient(schemaName);
  let inserted = 0;
  const errors = [...parseErrors];

  // Pre-flight: check for duplicate codes within the CSV batch
  const codeCounts = new Map<string, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const code = rows[i].code.toLowerCase();
    const existing = codeCounts.get(code) ?? [];
    existing.push(i + 2);
    codeCounts.set(code, existing);
  }
  for (const [code, rowNums] of codeCounts) {
    if (rowNums.length > 1) {
      for (const rowNum of rowNums.slice(1)) {
        errors.push({ row: rowNum, field: 'code', message: `Duplicate code "${code}" within CSV (first on row ${rowNums[0]})` });
      }
    }
  }

  // Pre-flight: check for codes that already exist in DB
  const incomingCodes = [...new Set(rows.map((r) => r.code))];
  const { data: existingRows } = await client
    .from('commodities')
    .select('code')
    .in('code', incomingCodes)
    .is('deleted_at', null);
  const existingCodes = new Set((existingRows ?? []).map((r) => r.code.toLowerCase()));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (existingCodes.has(row.code.toLowerCase())) {
      errors.push({ row: rowNum, field: 'code', message: `Item code "${row.code}" already exists` });
      continue;
    }

    // Skip rows flagged as CSV-internal duplicates
    const dupeRows = codeCounts.get(row.code.toLowerCase()) ?? [];
    if (dupeRows.length > 1 && dupeRows[0] !== rowNum) continue;

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
