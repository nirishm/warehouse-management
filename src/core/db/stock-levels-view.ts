import { execSql } from './exec-sql';

export interface StockLevelsViewOptions {
  includeReturns: boolean;
  includeAdjustments: boolean;
}

/**
 * Builds the stock_levels VIEW SQL for a tenant schema.
 *
 * The VIEW uses three CTEs:
 *   - inbound:    purchase_items received + dispatch_items at destination received
 *                 + (optional) sale_return items confirmed
 *                 + (optional) adjustment add-direction items
 *   - outbound:   dispatch_items from origin + sale_items confirmed/dispatched
 *                 + (optional) purchase_return items confirmed
 *                 + (optional) adjustment remove-direction items
 *   - in_transit: dispatch_items still in transit (dispatched/in_transit statuses)
 *
 * Columns: commodity_id, location_id, unit_id, total_in, total_out,
 *          current_stock, in_transit
 */
export function buildStockLevelsViewSQL(
  schemaName: string,
  options: StockLevelsViewOptions
): string {
  const { includeReturns, includeAdjustments } = options;

  const saleReturnInbound = includeReturns
    ? `
        UNION ALL

        SELECT ri.commodity_id, r.location_id, ri.unit_id, ri.quantity
        FROM "${schemaName}".return_items ri
        JOIN "${schemaName}".returns r ON r.id = ri.return_id
        WHERE r.return_type = 'sale_return' AND r.status = 'confirmed' AND r.deleted_at IS NULL`
    : '';

  const purchaseReturnOutbound = includeReturns
    ? `
        UNION ALL

        SELECT ri.commodity_id, r.location_id, ri.unit_id, ri.quantity
        FROM "${schemaName}".return_items ri
        JOIN "${schemaName}".returns r ON r.id = ri.return_id
        WHERE r.return_type = 'purchase_return' AND r.status = 'confirmed' AND r.deleted_at IS NULL`
    : '';

  const adjustmentInbound = includeAdjustments
    ? `
        UNION ALL

        SELECT a.commodity_id, a.location_id, a.unit_id, a.quantity
        FROM "${schemaName}".adjustments a
        JOIN "${schemaName}".adjustment_reasons ar ON ar.id = a.reason_id
        WHERE ar.direction = 'add' AND a.deleted_at IS NULL`
    : '';

  const adjustmentOutbound = includeAdjustments
    ? `
        UNION ALL

        SELECT a.commodity_id, a.location_id, a.unit_id, a.quantity
        FROM "${schemaName}".adjustments a
        JOIN "${schemaName}".adjustment_reasons ar ON ar.id = a.reason_id
        WHERE ar.direction = 'remove' AND a.deleted_at IS NULL`
    : '';

  return `
    CREATE OR REPLACE VIEW "${schemaName}".stock_levels AS
    WITH inbound AS (
        SELECT di.commodity_id, d.dest_location_id AS location_id, di.unit_id,
               COALESCE(di.received_quantity, di.sent_quantity) AS quantity
        FROM "${schemaName}".dispatch_items di
        JOIN "${schemaName}".dispatches d ON d.id = di.dispatch_id
        WHERE d.status = 'received' AND d.deleted_at IS NULL

        UNION ALL

        SELECT pi.commodity_id, p.location_id, pi.unit_id, pi.quantity
        FROM "${schemaName}".purchase_items pi
        JOIN "${schemaName}".purchases p ON p.id = pi.purchase_id
        WHERE p.status = 'received' AND p.deleted_at IS NULL${saleReturnInbound}${adjustmentInbound}
    ),
    outbound AS (
        SELECT di.commodity_id, d.origin_location_id AS location_id, di.unit_id,
               di.sent_quantity AS quantity
        FROM "${schemaName}".dispatch_items di
        JOIN "${schemaName}".dispatches d ON d.id = di.dispatch_id
        WHERE d.status IN ('dispatched','in_transit','received') AND d.deleted_at IS NULL

        UNION ALL

        SELECT si.commodity_id, s.location_id, si.unit_id, si.quantity
        FROM "${schemaName}".sale_items si
        JOIN "${schemaName}".sales s ON s.id = si.sale_id
        WHERE s.status IN ('confirmed','dispatched') AND s.deleted_at IS NULL${purchaseReturnOutbound}${adjustmentOutbound}
    ),
    in_transit AS (
        SELECT di.commodity_id, d.dest_location_id AS location_id, di.unit_id,
               di.sent_quantity AS quantity
        FROM "${schemaName}".dispatch_items di
        JOIN "${schemaName}".dispatches d ON d.id = di.dispatch_id
        WHERE d.status IN ('dispatched','in_transit') AND d.deleted_at IS NULL
    )
    SELECT
        COALESCE(i.commodity_id, o.commodity_id) AS commodity_id,
        COALESCE(i.location_id, o.location_id) AS location_id,
        COALESCE(i.unit_id, o.unit_id) AS unit_id,
        COALESCE(i.total_in, 0) AS total_in,
        COALESCE(o.total_out, 0) AS total_out,
        COALESCE(i.total_in, 0) - COALESCE(o.total_out, 0) AS current_stock,
        COALESCE(t.in_transit, 0) AS in_transit
    FROM (
        SELECT commodity_id, location_id, unit_id, SUM(quantity) AS total_in
        FROM inbound GROUP BY commodity_id, location_id, unit_id
    ) i
    FULL OUTER JOIN (
        SELECT commodity_id, location_id, unit_id, SUM(quantity) AS total_out
        FROM outbound GROUP BY commodity_id, location_id, unit_id
    ) o ON i.commodity_id = o.commodity_id AND i.location_id = o.location_id AND i.unit_id = o.unit_id
    LEFT JOIN (
        SELECT commodity_id, location_id, unit_id, SUM(quantity) AS in_transit
        FROM in_transit GROUP BY commodity_id, location_id, unit_id
    ) t ON COALESCE(i.commodity_id, o.commodity_id) = t.commodity_id
       AND COALESCE(i.location_id, o.location_id) = t.location_id
       AND COALESCE(i.unit_id, o.unit_id) = t.unit_id;
  `;
}

/**
 * Detects which optional module tables are present in the given schema, then
 * rebuilds the stock_levels VIEW to match. Call this from any module migration
 * that affects stock levels — it will automatically include every module whose
 * tables already exist.
 *
 * @param schemaName  Fully-qualified tenant schema name (e.g. "tenant_acme")
 * @param overrides   Force-enable specific modules regardless of table detection
 *                    (useful when calling immediately after creating those tables)
 */
export async function rebuildStockLevelsView(
  schemaName: string,
  overrides: Partial<StockLevelsViewOptions> = {}
): Promise<void> {
  // Detect which optional tables exist in the schema
  const rows = await execSql<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = '${schemaName}'
       AND table_name IN ('return_items', 'adjustment_items', 'adjustments')`
  );
  const existingTables = new Set(rows.map((r) => r.table_name));

  const options: StockLevelsViewOptions = {
    includeReturns: overrides.includeReturns ?? existingTables.has('return_items'),
    // adjustments uses the "adjustments" table (not "adjustment_items")
    includeAdjustments:
      overrides.includeAdjustments ??
      (existingTables.has('adjustments') || existingTables.has('adjustment_items')),
  };

  const sql = buildStockLevelsViewSQL(schemaName, options);
  await execSql(sql);
}
