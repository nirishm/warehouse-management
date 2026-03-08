import { createTenantClient } from '@/core/db/tenant-query';
import type { ContactRow } from '../schemas/contacts-csv';
import type { ImportResult } from './import-commodities';

export async function importContacts(
  schemaName: string,
  rows: ContactRow[],
  parseErrors: { row: number; field: string; message: string }[]
): Promise<ImportResult> {
  const client = createTenantClient(schemaName);
  let inserted = 0;
  const errors = [...parseErrors];
  const warnings: { row: number; field: string; message: string }[] = [];

  // Pre-flight: detect duplicate name+type combos within the CSV batch
  const keyToRows = new Map<string, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const key = `${rows[i].name.toLowerCase()}::${rows[i].type}`;
    const existing = keyToRows.get(key) ?? [];
    existing.push(i + 2);
    keyToRows.set(key, existing);
  }
  for (const [, rowNums] of keyToRows) {
    if (rowNums.length > 1) {
      for (const rowNum of rowNums.slice(1)) {
        warnings.push({
          row: rowNum,
          field: 'name',
          message: `Duplicate name+type in CSV (first on row ${rowNums[0]})`,
        });
      }
    }
  }

  // Pre-flight: check for name+type combos that already exist in DB
  const incomingNames = [...new Set(rows.map((r) => r.name))];
  const { data: existingContacts } = await client
    .from('contacts')
    .select('name,type')
    .in('name', incomingNames)
    .is('deleted_at', null);

  const existingKeys = new Set(
    (existingContacts ?? []).map((c) => `${c.name.toLowerCase()}::${c.type}`)
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const key = `${row.name.toLowerCase()}::${row.type}`;

    if (existingKeys.has(key)) {
      warnings.push({
        row: rowNum,
        field: 'name',
        message: `Contact "${row.name}" (${row.type}) already exists in database`,
      });
    }

    try {
      const { error } = await client
        .from('contacts')
        .insert({
          name: row.name,
          type: row.type,
          phone: row.phone || null,
          email: row.email || null,
          address: row.address || null,
        });
      if (error) {
        errors.push({ row: rowNum, field: 'name', message: error.message });
      } else {
        inserted++;
      }
    } catch (e) {
      errors.push({ row: rowNum, field: '_row', message: String(e) });
    }
  }

  return {
    summary: { total: rows.length, inserted, failed: rows.length - inserted },
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
