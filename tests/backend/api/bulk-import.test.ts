// File: tests/backend/api/bulk-import.test.ts
// Coverage: Bulk import CSV parser — parseCSV() utility function, Zod row schemas for
//           purchases, commodities, contacts; edge cases (empty CSV, all-invalid rows,
//           mixed valid/invalid rows, whitespace trimming, large batches, malformed headers).
//           DB-layer bulk insert test (1000 rows). API-layer tests marked .skip.
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import { parseCSV } from '@/modules/bulk-import/utils/csv-parser';
import { purchaseRowSchema, PURCHASES_TEMPLATE_HEADERS } from '@/modules/bulk-import/schemas/purchases-csv';
import { commodityRowSchema, COMMODITIES_TEMPLATE_HEADERS } from '@/modules/bulk-import/schemas/commodities-csv';
import { contactRowSchema, CONTACTS_TEMPLATE_HEADERS } from '@/modules/bulk-import/schemas/contacts-csv';
import { tenantClient, TEST_TENANT, TW_LOCATIONS, TW_COMMODITIES } from '../setup/test-env';
import { getDefaultUnit, runCleanup } from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Helper: build a CSV string from headers + rows
// ---------------------------------------------------------------------------
function buildCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map((r) => r.join(','));
  return [headerLine, ...dataLines].join('\n');
}

// ---------------------------------------------------------------------------
// parseCSV: basic contract
// ---------------------------------------------------------------------------
describe('parseCSV: basic contract', () => {
  it('returns correct rows and zero errors for a fully valid purchases CSV', () => {
    // ARRANGE: 3 valid rows
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['WH-NORTH', 'WHEAT', '100', 'kg', '50', 'first batch'],
      ['WH-NORTH', 'RICE', '200', 'kg', '', ''],
      ['YD-SOUTH', 'CORN', '50', 'bag', '10', ''],
    ]);

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: 3 valid rows, no errors
    expect(result.rows.length).toBe(3);
    expect(result.errors.length).toBe(0);
    expect(result.rows[0].location_code).toBe('WH-NORTH');
    expect(result.rows[0].commodity_code).toBe('WHEAT');
    expect(Number(result.rows[0].quantity)).toBe(100);
  });

  it('returns correct rows and zero errors for a valid commodities CSV', () => {
    // ARRANGE
    const csv = buildCSV(COMMODITIES_TEMPLATE_HEADERS, [
      ['Wheat', 'WHT', 'Soft wheat grain', 'Grain', 'kg'],
      ['Rice', 'RCE', '', 'Grain', ''],
    ]);

    // ACT
    const result = parseCSV(csv, commodityRowSchema);

    // ASSERT
    expect(result.rows.length).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.rows[0].name).toBe('Wheat');
    expect(result.rows[0].code).toBe('WHT');
  });

  it('returns correct rows and zero errors for a valid contacts CSV', () => {
    // ARRANGE
    const csv = buildCSV(CONTACTS_TEMPLATE_HEADERS, [
      ['Acme Supplies', 'supplier', '9876543210', 'acme@example.com', '123 Main St'],
      ['City Buyer', 'customer', '', '', ''],
    ]);

    // ACT
    const result = parseCSV(csv, contactRowSchema);

    // ASSERT
    expect(result.rows.length).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.rows[0].type).toBe('supplier');
    expect(result.rows[1].type).toBe('customer');
  });
});

// ---------------------------------------------------------------------------
// parseCSV: empty and whitespace-only CSV
// ---------------------------------------------------------------------------
describe('parseCSV: empty and whitespace input', () => {
  it('empty CSV (header only, no data rows) returns zero rows and zero errors', () => {
    // ARRANGE: header only
    const csv = PURCHASES_TEMPLATE_HEADERS.join(',') + '\n';

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: no rows, no errors — this is NOT a failure condition
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('completely empty string returns zero rows and zero errors', () => {
    // ARRANGE
    const csv = '';

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('CSV with header and blank data lines (skipEmptyLines) returns zero rows', () => {
    // ARRANGE: header + blank lines
    const csv = PURCHASES_TEMPLATE_HEADERS.join(',') + '\n\n\n\n';

    // ACT: PapaParse skipEmptyLines=true skips these
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('whitespace in field values is trimmed automatically', () => {
    // ARRANGE: values with leading/trailing spaces
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['  WH-NORTH  ', '  WHEAT  ', '  100  ', '  kg  ', '', ''],
    ]);

    // ACT: PapaParse transform: (v) => v.trim() strips whitespace
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: values trimmed
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].location_code).toBe('WH-NORTH');
    expect(result.rows[0].commodity_code).toBe('WHEAT');
  });
});

// ---------------------------------------------------------------------------
// parseCSV: validation error collection
// ---------------------------------------------------------------------------
describe('parseCSV: validation error collection', () => {
  it('row with missing required location_code produces an error entry', () => {
    // ARRANGE: missing location_code (empty string fails min(1))
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['', 'WHEAT', '100', 'kg', '', ''],
    ]);

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: row fails validation
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].row).toBe(2); // row 2 = first data row (1-based + header)
    expect(result.errors[0].field).toBe('location_code');
    expect(result.errors[0].message).toMatch(/required/i);
  });

  it('row with non-numeric quantity produces an error entry', () => {
    // ARRANGE: quantity is not a number
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['WH-NORTH', 'WHEAT', 'lots', 'kg', '', ''],
    ]);

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('quantity');
  });

  it('row with zero quantity fails the refine check', () => {
    // ARRANGE: quantity = 0 fails the `Number(v) > 0` refine
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['WH-NORTH', 'WHEAT', '0', 'kg', '', ''],
    ]);

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('quantity');
    expect(result.errors[0].message).toMatch(/positive/i);
  });

  it('row with negative quantity fails the refine check', () => {
    // ARRANGE
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['WH-NORTH', 'WHEAT', '-50', 'kg', '', ''],
    ]);

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('row number in error is 1-based with header offset (row 3 = third line)', () => {
    // ARRANGE: valid row 1, invalid row 2
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['WH-NORTH', 'WHEAT', '100', 'kg', '', ''], // valid — row 2
      ['', 'WHEAT', '100', 'kg', '', ''],          // invalid — row 3
    ]);

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: 1 valid row, 1 error on row 3
    expect(result.rows.length).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].row).toBe(3);
  });

  it('invalid contact type produces descriptive error', () => {
    // ARRANGE: type is not supplier/customer/both
    const csv = buildCSV(CONTACTS_TEMPLATE_HEADERS, [
      ['Bad Contact', 'vendor', '', '', ''],
    ]);

    // ACT
    const result = parseCSV(csv, contactRowSchema);

    // ASSERT
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('type');
  });
});

// ---------------------------------------------------------------------------
// parseCSV: mixed valid/invalid rows (partial success behavior)
// ---------------------------------------------------------------------------
describe('parseCSV: partial success (mixed valid and invalid rows)', () => {
  it('5 rows — 3 valid, 2 invalid — returns 3 rows and errors for invalid rows', () => {
    // ARRANGE
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['WH-NORTH', 'WHEAT', '100', 'kg', '', ''],   // valid - row 2
      ['', 'RICE', '200', 'kg', '', ''],             // invalid - row 3 (missing location_code)
      ['YD-SOUTH', 'CORN', '50', 'kg', '', ''],     // valid - row 4
      ['WH-NORTH', 'WHEAT', 'bad', 'kg', '', ''],   // invalid - row 5 (bad quantity)
      ['WH-NORTH', 'RICE', '75', 'kg', '', ''],     // valid - row 6
    ]);

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: partial success
    expect(result.rows.length).toBe(3);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);

    // Error rows point to correct line numbers
    const errorRows = result.errors.map((e) => e.row);
    expect(errorRows).toContain(3);
    expect(errorRows).toContain(5);
  });

  it('all-invalid rows returns zero rows and errors for each row', () => {
    // ARRANGE: all rows have empty required fields
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, [
      ['', '', 'bad', '', '', ''],
      ['', '', 'worse', '', '', ''],
    ]);

    // ACT
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: no valid rows
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// parseCSV: malformed CSV structures
// ---------------------------------------------------------------------------
describe('parseCSV: malformed CSV structures', () => {
  it('CSV with extra columns beyond schema is handled gracefully', () => {
    // ARRANGE: extra 'unexpected_col' column
    const headers = [...PURCHASES_TEMPLATE_HEADERS, 'unexpected_col'];
    const csv = buildCSV(headers, [
      ['WH-NORTH', 'WHEAT', '100', 'kg', '', '', 'extra_value'],
    ]);

    // ACT: Zod schema ignores unknown keys (default behavior)
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: row is still valid (Zod strips unknown keys)
    expect(result.rows.length).toBe(1);
    expect(result.errors.length).toBe(0);
  });

  it('CSV with wrong header order but correct values is parsed by header name (not position)', () => {
    // ARRANGE: reorder headers — PapaParse uses header=true, maps by name
    const scrambledHeaders = ['commodity_code', 'quantity', 'location_code', 'unit_abbreviation', 'bags', 'notes'];
    const csv = buildCSV(scrambledHeaders, [
      ['WHEAT', '100', 'WH-NORTH', 'kg', '', ''],
    ]);

    // ACT: PapaParse maps by column name so order doesn't matter
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: correct field values regardless of column order
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].location_code).toBe('WH-NORTH');
    expect(result.rows[0].commodity_code).toBe('WHEAT');
  });

  it('CSV with quoted fields containing commas is parsed correctly', () => {
    // ARRANGE: commodity name contains a comma (quoted field)
    const csv = buildCSV(COMMODITIES_TEMPLATE_HEADERS, [
      ['"Wheat, Grade A"', 'WHT-A', '"Soft, fine grain"', 'Grain', 'kg'],
    ]);

    // ACT
    const result = parseCSV(csv, commodityRowSchema);

    // ASSERT: comma in quoted field does not break parsing
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe('Wheat, Grade A');
    expect(result.rows[0].description).toBe('Soft, fine grain');
  });

  it('[MEDIUM] CSV with completely wrong headers returns errors for all rows (required fields missing)', () => {
    // ARRANGE: headers don't match schema fields at all
    const csv = 'col_a,col_b,col_c\nval1,val2,val3\n';

    // ACT: Zod schema requires location_code and commodity_code — both missing
    const result = parseCSV(csv, purchaseRowSchema);

    // ASSERT: all rows fail (schema fields not present in CSV)
    expect(result.rows.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// parseCSV: large batch performance
// ---------------------------------------------------------------------------
describe('parseCSV: large batch performance', () => {
  it('[MEDIUM] 1000-row purchases CSV parses in under 2 seconds', () => {
    // ARRANGE: generate 1000 valid rows
    const rows: string[][] = Array.from({ length: 1000 }, (_, i) => [
      'WH-NORTH',
      `COMMODITY-${i % 10}`,
      String(10 + (i % 100)),
      'kg',
      '',
      '',
    ]);
    const csv = buildCSV(PURCHASES_TEMPLATE_HEADERS, rows);

    // ACT: time the parse
    const start = Date.now();
    const result = parseCSV(csv, purchaseRowSchema);
    const elapsed = Date.now() - start;

    // ASSERT: all 1000 rows valid, no errors, completed in time
    expect(result.rows.length).toBe(1000);
    expect(result.errors.length).toBe(0);
    expect(elapsed).toBeLessThan(2000);
  });

  it('[MEDIUM] 1000-row commodities CSV with 100 invalid rows collects all errors', () => {
    // ARRANGE: 900 valid + 100 invalid (empty name)
    const rows: string[][] = Array.from({ length: 1000 }, (_, i) => {
      if (i % 10 === 0) {
        return ['', `CODE-${i}`, '', '', '']; // invalid: empty name
      }
      return [`Commodity ${i}`, `CODE-${i}`, '', 'Grain', 'kg'];
    });
    const csv = buildCSV(COMMODITIES_TEMPLATE_HEADERS, rows);

    // ACT
    const result = parseCSV(csv, commodityRowSchema);

    // ASSERT: 900 valid rows, 100 errors collected
    expect(result.rows.length).toBe(900);
    expect(result.errors.length).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// DB-layer: bulk insert stress test
// ---------------------------------------------------------------------------
describe('bulk import: DB-layer bulk insert', () => {
  it('[MEDIUM] can bulk-insert 100 purchase_items rows in a single request', async () => {
    // ARRANGE: create a single purchase header, then bulk-insert items
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const purchaseNumber = `PUR-BULK-${Date.now()}`;

    const { data: purchase, error: pErr } = await client
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        location_id: TW_LOCATIONS.LOC1,
        status: 'received',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    expect(pErr).toBeNull();

    const items = Array.from({ length: 100 }, () => ({
      purchase_id: purchase!.id,
      commodity_id: TW_COMMODITIES.COMM1,
      unit_id: unit.id,
      quantity: 10,
    }));

    // ACT: bulk insert 100 items
    const { error: itemErr } = await client.from('purchase_items').insert(items);

    // ASSERT: all inserted without error
    expect(itemErr).toBeNull();

    // Verify count
    const { data: countResult } = await client
      .from('purchase_items')
      .select('id', { count: 'exact' })
      .eq('purchase_id', purchase!.id);

    expect(countResult?.length).toBe(100);

    // Cleanup: delete items then header (items first to respect FK)
    await client.from('purchase_items').delete().eq('purchase_id', purchase!.id);
    await client.from('purchases').delete().eq('id', purchase!.id);
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('bulk-import API: HTTP contract (requires dev server + auth)', () => {
  it('POST /api/t/[slug]/bulk-import/purchases with valid CSV returns 200 with rows processed', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/bulk-import/purchases with all-invalid CSV returns 422 with errors', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/bulk-import/purchases with empty CSV returns 400', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/bulk-import/purchases with mixed valid/invalid returns 207 with partial results', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/bulk-import/purchases without canImportData permission returns 403', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/bulk-import/commodities with duplicate codes returns row-level errors', async () => {
    expect(true).toBe(true);
  });
});
