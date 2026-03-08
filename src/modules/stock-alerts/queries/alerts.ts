import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  UpsertThresholdInput,
  StockAlertThreshold,
  StockAlert,
  AlertSummary,
  AlertState,
} from '../validations/threshold';

function computeAlertState(
  currentStock: number,
  minStock: number,
  reorderPoint: number
): AlertState {
  if (currentStock <= 0 || currentStock <= minStock) return 'CRITICAL';
  if (currentStock <= reorderPoint) return 'WARNING';
  return 'OK';
}

export async function getStockAlerts(schemaName: string): Promise<StockAlert[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.rpc('exec_sql', {
    query: `
      SELECT
        t.id AS threshold_id,
        t.commodity_id,
        c.name AS commodity_name,
        c.code AS commodity_code,
        t.location_id,
        l.name AS location_name,
        t.unit_id,
        u.abbreviation AS unit_abbreviation,
        COALESCE(sl.current_stock, 0) AS current_stock,
        t.min_stock,
        t.reorder_point
      FROM "${schemaName}".stock_alert_thresholds t
      JOIN "${schemaName}".commodities c ON c.id = t.commodity_id AND c.deleted_at IS NULL
      JOIN "${schemaName}".locations l ON l.id = t.location_id AND l.deleted_at IS NULL
      JOIN "${schemaName}".units u ON u.id = t.unit_id
      LEFT JOIN "${schemaName}".stock_levels sl
        ON sl.commodity_id = t.commodity_id
        AND sl.location_id = t.location_id
        AND sl.unit_id = t.unit_id
      WHERE t.is_active = true
      ORDER BY c.name, l.name
    `,
  });

  if (error) throw new Error(`Failed to get stock alerts: ${error.message}`);

  return ((data as unknown[]) ?? []).map((row: unknown) => {
    const r = row as {
      threshold_id: string;
      commodity_id: string;
      commodity_name: string;
      commodity_code: string;
      location_id: string;
      location_name: string;
      unit_id: string;
      unit_abbreviation: string;
      current_stock: number;
      min_stock: number;
      reorder_point: number;
    };
    return {
      ...r,
      current_stock: Number(r.current_stock),
      min_stock: Number(r.min_stock),
      reorder_point: Number(r.reorder_point),
      alert_state: computeAlertState(
        Number(r.current_stock),
        Number(r.min_stock),
        Number(r.reorder_point)
      ),
    };
  });
}

export async function getAlertSummary(schemaName: string): Promise<AlertSummary> {
  const alerts = await getStockAlerts(schemaName);
  const summary: AlertSummary = { total: alerts.length, critical: 0, warning: 0, ok: 0 };
  for (const a of alerts) {
    if (a.alert_state === 'CRITICAL') summary.critical++;
    else if (a.alert_state === 'WARNING') summary.warning++;
    else summary.ok++;
  }
  return summary;
}

export async function listThresholds(schemaName: string): Promise<StockAlertThreshold[]> {
  const client = createTenantClient(schemaName);
  const { data, error } = await client
    .from('stock_alert_thresholds')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list thresholds: ${error.message}`);
  return (data ?? []) as StockAlertThreshold[];
}

export async function upsertThreshold(
  schemaName: string,
  input: UpsertThresholdInput,
  userId: string
): Promise<StockAlertThreshold> {
  const client = createTenantClient(schemaName);

  // Try to find existing threshold for this commodity+location+unit
  const { data: existing } = await client
    .from('stock_alert_thresholds')
    .select('id')
    .eq('commodity_id', input.commodity_id)
    .eq('location_id', input.location_id)
    .eq('unit_id', input.unit_id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await client
      .from('stock_alert_thresholds')
      .update({
        min_stock: input.min_stock,
        reorder_point: input.reorder_point,
        is_active: input.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to update threshold: ${error.message}`);
    return data as StockAlertThreshold;
  } else {
    const { data, error } = await client
      .from('stock_alert_thresholds')
      .insert({
        commodity_id: input.commodity_id,
        location_id: input.location_id,
        unit_id: input.unit_id,
        min_stock: input.min_stock,
        reorder_point: input.reorder_point,
        is_active: input.is_active,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to create threshold: ${error.message}`);
    return data as StockAlertThreshold;
  }
}

export async function deleteThreshold(schemaName: string, id: string): Promise<void> {
  const client = createTenantClient(schemaName);
  const { error } = await client.from('stock_alert_thresholds').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete threshold: ${error.message}`);
}
