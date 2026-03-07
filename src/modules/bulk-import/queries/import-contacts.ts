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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
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

  return { summary: { total: rows.length, inserted, failed: rows.length - inserted }, errors };
}
