import { describe, it, expect } from 'vitest';
import { buildStockLevelsViewSQL } from '@/core/db/stock-levels-view';

describe('buildStockLevelsViewSQL', () => {
  const schema = 'tenant_acme';

  it('includes CREATE OR REPLACE VIEW with schema name', () => {
    const sql = buildStockLevelsViewSQL(schema, { includeReturns: false, includeAdjustments: false });
    expect(sql).toContain('CREATE OR REPLACE VIEW');
    expect(sql).toContain(`"${schema}".stock_levels`);
  });

  it('excludes returns and adjustments when both disabled', () => {
    const sql = buildStockLevelsViewSQL(schema, { includeReturns: false, includeAdjustments: false });
    expect(sql).not.toContain('return_items');
    expect(sql).not.toContain('adjustment_reasons');
    expect(sql).not.toContain('.adjustments');
  });

  it('includes return_items but not adjustment_reasons when only returns enabled', () => {
    const sql = buildStockLevelsViewSQL(schema, { includeReturns: true, includeAdjustments: false });
    expect(sql).toContain('return_items');
    expect(sql).toContain('sale_return');
    expect(sql).toContain('purchase_return');
    expect(sql).not.toContain('adjustment_reasons');
  });

  it('includes adjustment_reasons but not return_items when only adjustments enabled', () => {
    const sql = buildStockLevelsViewSQL(schema, { includeReturns: false, includeAdjustments: true });
    expect(sql).not.toContain('return_items');
    expect(sql).toContain('adjustment_reasons');
    expect(sql).toContain('.adjustments');
  });

  it('includes both return_items and adjustment_reasons when both enabled', () => {
    const sql = buildStockLevelsViewSQL(schema, { includeReturns: true, includeAdjustments: true });
    expect(sql).toContain('return_items');
    expect(sql).toContain('adjustment_reasons');
  });

  it('uses the provided schema name for all table references', () => {
    const sql = buildStockLevelsViewSQL('tenant_foo', { includeReturns: true, includeAdjustments: true });
    // Every table reference should use the schema name
    expect(sql).toContain('"tenant_foo".dispatch_items');
    expect(sql).toContain('"tenant_foo".dispatches');
    expect(sql).toContain('"tenant_foo".purchase_items');
    expect(sql).toContain('"tenant_foo".return_items');
    expect(sql).toContain('"tenant_foo".adjustments');
  });
});
