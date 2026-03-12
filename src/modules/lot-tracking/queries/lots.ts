import { createTenantClient, getNextSequenceNumber } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CreateLotInput, Lot, LotWithDetails, LotMovement } from '../validations/lot';

export async function listLots(schemaName: string): Promise<LotWithDetails[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('exec_sql', {
    query: `
      SELECT
        l.id, l.lot_number, l.commodity_id, l.source_purchase_id,
        l.received_date, l.expiry_date, l.initial_quantity, l.unit_id,
        l.notes, l.created_at, l.updated_at,
        c.name AS commodity_name, c.code AS commodity_code,
        u.name AS unit_name, u.abbreviation AS unit_abbreviation,
        COALESCE(sl.current_quantity, l.initial_quantity) AS current_quantity
      FROM "${schemaName}".lots l
      LEFT JOIN "${schemaName}".commodities c ON c.id = l.commodity_id
      LEFT JOIN "${schemaName}".units u ON u.id = l.unit_id
      LEFT JOIN "${schemaName}".lot_stock_levels sl ON sl.lot_id = l.id
      WHERE l.deleted_at IS NULL
      ORDER BY l.received_date DESC
    `,
  });
  if (error) throw new Error(`Failed to list lots: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    lot_number: row.lot_number as string,
    commodity_id: row.commodity_id as string,
    source_purchase_id: (row.source_purchase_id as string) ?? null,
    received_date: row.received_date as string,
    expiry_date: (row.expiry_date as string) ?? null,
    initial_quantity: Number(row.initial_quantity),
    unit_id: row.unit_id as string,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: null,
    commodity: row.commodity_name
      ? { id: row.commodity_id as string, name: row.commodity_name as string, code: row.commodity_code as string }
      : null,
    unit: row.unit_name
      ? { id: row.unit_id as string, name: row.unit_name as string, abbreviation: (row.unit_abbreviation as string) ?? null }
      : null,
    current_quantity: Number(row.current_quantity ?? row.initial_quantity),
  }));
}

export async function getLot(schemaName: string, id: string): Promise<LotWithDetails | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('exec_sql', {
    query: `
      SELECT
        l.id, l.lot_number, l.commodity_id, l.source_purchase_id,
        l.received_date, l.expiry_date, l.initial_quantity, l.unit_id,
        l.notes, l.created_at, l.updated_at,
        c.name AS commodity_name, c.code AS commodity_code,
        u.name AS unit_name, u.abbreviation AS unit_abbreviation,
        COALESCE(sl.current_quantity, l.initial_quantity) AS current_quantity
      FROM "${schemaName}".lots l
      LEFT JOIN "${schemaName}".commodities c ON c.id = l.commodity_id
      LEFT JOIN "${schemaName}".units u ON u.id = l.unit_id
      LEFT JOIN "${schemaName}".lot_stock_levels sl ON sl.lot_id = l.id
      WHERE l.id = '${id}' AND l.deleted_at IS NULL
      LIMIT 1
    `,
  });
  if (error) throw new Error(`Failed to get lot: ${error.message}`);
  const rows = data as Record<string, unknown>[] | null;
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as string,
    lot_number: row.lot_number as string,
    commodity_id: row.commodity_id as string,
    source_purchase_id: (row.source_purchase_id as string) ?? null,
    received_date: row.received_date as string,
    expiry_date: (row.expiry_date as string) ?? null,
    initial_quantity: Number(row.initial_quantity),
    unit_id: row.unit_id as string,
    notes: (row.notes as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: null,
    commodity: row.commodity_name
      ? { id: row.commodity_id as string, name: row.commodity_name as string, code: row.commodity_code as string }
      : null,
    unit: row.unit_name
      ? { id: row.unit_id as string, name: row.unit_name as string, abbreviation: (row.unit_abbreviation as string) ?? null }
      : null,
    current_quantity: Number(row.current_quantity ?? row.initial_quantity),
  };
}

export async function createLot(
  schemaName: string,
  input: CreateLotInput,
  userId: string
): Promise<Lot> {
  const client = createTenantClient(schemaName);
  const lotNumber = input.lot_number ?? (await getNextSequenceNumber(schemaName, 'lot'));

  const { data, error } = await client
    .from('lots')
    .insert({
      lot_number: lotNumber,
      commodity_id: input.commodity_id,
      source_purchase_id: input.source_purchase_id ?? null,
      received_date: input.received_date ?? new Date().toISOString(),
      expiry_date: input.expiry_date ?? null,
      initial_quantity: input.initial_quantity,
      unit_id: input.unit_id,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create lot: ${error.message}`);
  void userId; // reserved for audit log
  return data as Lot;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getLotMovements(
  schemaName: string,
  lotId: string
): Promise<LotMovement[]> {
  if (!UUID_RE.test(lotId)) throw new Error('Invalid lot ID');
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('exec_sql', {
    query: `
      SELECT 'dispatch' AS movement_type, d.dispatch_number AS reference_number,
             di.sent_quantity AS quantity, d.dispatched_at AS movement_date, di.id
      FROM "${schemaName}".dispatch_items di
      JOIN "${schemaName}".dispatches d ON d.id = di.dispatch_id
      WHERE di.lot_id = '${lotId}' AND d.deleted_at IS NULL

      UNION ALL

      SELECT 'sale' AS movement_type, s.sale_number AS reference_number,
             si.quantity AS quantity, s.sold_at AS movement_date, si.id
      FROM "${schemaName}".sale_items si
      JOIN "${schemaName}".sales s ON s.id = si.sale_id
      WHERE si.lot_id = '${lotId}' AND s.deleted_at IS NULL

      ORDER BY movement_date DESC
    `,
  });
  if (error) throw new Error(`Failed to get lot movements: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    movement_type: row.movement_type as 'dispatch' | 'sale',
    reference_number: row.reference_number as string,
    quantity: Number(row.quantity),
    movement_date: (row.movement_date as string) ?? new Date().toISOString(),
  }));
}
