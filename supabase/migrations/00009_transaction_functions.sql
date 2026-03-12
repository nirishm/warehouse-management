-- Transaction functions for multi-step entity creation (auto-transactional)
-- All functions use SECURITY DEFINER and format('%I', p_schema) for safe schema injection.
-- Values are always passed via $N parameter binding, never string-interpolated.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. create_dispatch_txn
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_dispatch_txn(
  p_schema  TEXT,
  p_input   JSONB,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispatch_number TEXT;
  v_dispatch_id     UUID;
  v_dispatch_row    JSONB;
  v_item            JSONB;
BEGIN
  -- Get next sequence number
  v_dispatch_number := get_next_sequence(p_schema, 'dispatch');

  -- Insert dispatch header
  EXECUTE format(
    'INSERT INTO %I.dispatches (
       dispatch_number, origin_location_id, dest_location_id, status,
       dispatched_at, dispatched_by, transporter_name, vehicle_number,
       driver_name, driver_phone, notes
     ) VALUES ($1, $2, $3, ''dispatched'', now(), $4, $5, $6, $7, $8, $9)
     RETURNING id',
    p_schema
  ) INTO v_dispatch_id
  USING
    v_dispatch_number,
    (p_input->>'origin_location_id')::UUID,
    (p_input->>'dest_location_id')::UUID,
    p_user_id::UUID,
    p_input->>'transporter_name',
    p_input->>'vehicle_number',
    p_input->>'driver_name',
    p_input->>'driver_phone',
    p_input->>'notes';

  -- Insert line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_input->'items')
  LOOP
    EXECUTE format(
      'INSERT INTO %I.dispatch_items (dispatch_id, commodity_id, unit_id, sent_quantity, sent_bags)
       VALUES ($1, $2, $3, $4, $5)',
      p_schema
    ) USING
      v_dispatch_id,
      (v_item->>'commodity_id')::UUID,
      (v_item->>'unit_id')::UUID,
      (v_item->>'sent_quantity')::NUMERIC,
      (v_item->>'sent_bags')::INT;
  END LOOP;

  -- Audit log
  EXECUTE format(
    'INSERT INTO %I.audit_log (user_id, action, entity_type, entity_id, new_data)
     VALUES ($1, ''created'', ''dispatch'', $2, $3)',
    p_schema
  ) USING p_user_id::UUID, v_dispatch_id, p_input;

  -- Return the inserted dispatch row
  EXECUTE format(
    'SELECT to_jsonb(d) FROM %I.dispatches d WHERE d.id = $1',
    p_schema
  ) INTO v_dispatch_row
  USING v_dispatch_id;

  RETURN v_dispatch_row;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. create_purchase_txn
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_purchase_txn(
  p_schema  TEXT,
  p_input   JSONB,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_number TEXT;
  v_purchase_id     UUID;
  v_purchase_row    JSONB;
  v_item            JSONB;
  v_status          TEXT;
BEGIN
  v_purchase_number := get_next_sequence(p_schema, 'purchase');
  v_status := COALESCE(p_input->>'status', 'received');

  EXECUTE format(
    'INSERT INTO %I.purchases (
       purchase_number, location_id, contact_id, status,
       received_at, created_by, transporter_name, vehicle_number,
       driver_name, driver_phone, notes
     ) VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9, $10)
     RETURNING id',
    p_schema
  ) INTO v_purchase_id
  USING
    v_purchase_number,
    (p_input->>'location_id')::UUID,
    (p_input->>'contact_id')::UUID,
    v_status,
    p_user_id::UUID,
    p_input->>'transporter_name',
    p_input->>'vehicle_number',
    p_input->>'driver_name',
    p_input->>'driver_phone',
    p_input->>'notes';

  -- Insert line items (purchase_items has: quantity, bags, unit_price)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_input->'items')
  LOOP
    EXECUTE format(
      'INSERT INTO %I.purchase_items (purchase_id, commodity_id, unit_id, quantity, bags, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6)',
      p_schema
    ) USING
      v_purchase_id,
      (v_item->>'commodity_id')::UUID,
      (v_item->>'unit_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'bags')::INT,
      (v_item->>'unit_price')::NUMERIC;
  END LOOP;

  -- Audit log
  EXECUTE format(
    'INSERT INTO %I.audit_log (user_id, action, entity_type, entity_id, new_data)
     VALUES ($1, ''created'', ''purchase'', $2, $3)',
    p_schema
  ) USING p_user_id::UUID, v_purchase_id, p_input;

  EXECUTE format(
    'SELECT to_jsonb(p) FROM %I.purchases p WHERE p.id = $1',
    p_schema
  ) INTO v_purchase_row
  USING v_purchase_id;

  RETURN v_purchase_row;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. create_sale_txn
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_sale_txn(
  p_schema  TEXT,
  p_input   JSONB,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_number TEXT;
  v_sale_id     UUID;
  v_sale_row    JSONB;
  v_item        JSONB;
BEGIN
  v_sale_number := get_next_sequence(p_schema, 'sale');

  EXECUTE format(
    'INSERT INTO %I.sales (
       sale_number, location_id, contact_id, status, sold_at, created_by,
       transporter_name, vehicle_number, driver_name, driver_phone, notes
     ) VALUES ($1, $2, $3, ''confirmed'', now(), $4, $5, $6, $7, $8, $9)
     RETURNING id',
    p_schema
  ) INTO v_sale_id
  USING
    v_sale_number,
    (p_input->>'location_id')::UUID,
    (p_input->>'contact_id')::UUID,
    p_user_id::UUID,
    p_input->>'transporter_name',
    p_input->>'vehicle_number',
    p_input->>'driver_name',
    p_input->>'driver_phone',
    p_input->>'notes';

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_input->'items')
  LOOP
    EXECUTE format(
      'INSERT INTO %I.sale_items (sale_id, commodity_id, unit_id, quantity, bags, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6)',
      p_schema
    ) USING
      v_sale_id,
      (v_item->>'commodity_id')::UUID,
      (v_item->>'unit_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'bags')::INT,
      (v_item->>'unit_price')::NUMERIC;
  END LOOP;

  -- Audit log
  EXECUTE format(
    'INSERT INTO %I.audit_log (user_id, action, entity_type, entity_id, new_data)
     VALUES ($1, ''created'', ''sale'', $2, $3)',
    p_schema
  ) USING p_user_id::UUID, v_sale_id, p_input;

  EXECUTE format(
    'SELECT to_jsonb(s) FROM %I.sales s WHERE s.id = $1',
    p_schema
  ) INTO v_sale_row
  USING v_sale_id;

  RETURN v_sale_row;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. create_return_txn
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_return_txn(
  p_schema  TEXT,
  p_input   JSONB,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return_number TEXT;
  v_return_id     UUID;
  v_return_row    JSONB;
  v_item          JSONB;
BEGIN
  v_return_number := get_next_sequence(p_schema, 'return');

  EXECUTE format(
    'INSERT INTO %I.returns (
       return_number, return_type, original_txn_id, location_id, contact_id,
       return_date, reason, notes, status, created_by
     ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()), $7, $8, ''draft'', $9)
     RETURNING id',
    p_schema
  ) INTO v_return_id
  USING
    v_return_number,
    p_input->>'return_type',
    (p_input->>'original_txn_id')::UUID,
    (p_input->>'location_id')::UUID,
    (p_input->>'contact_id')::UUID,
    (p_input->>'return_date')::TIMESTAMPTZ,
    p_input->>'reason',
    p_input->>'notes',
    p_user_id::UUID;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_input->'items')
  LOOP
    EXECUTE format(
      'INSERT INTO %I.return_items (return_id, commodity_id, unit_id, quantity, lot_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)',
      p_schema
    ) USING
      v_return_id,
      (v_item->>'commodity_id')::UUID,
      (v_item->>'unit_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'lot_id')::UUID,
      v_item->>'notes';
  END LOOP;

  -- Audit log
  EXECUTE format(
    'INSERT INTO %I.audit_log (user_id, action, entity_type, entity_id, new_data)
     VALUES ($1, ''created'', ''return'', $2, $3)',
    p_schema
  ) USING p_user_id::UUID, v_return_id, p_input;

  EXECUTE format(
    'SELECT to_jsonb(r) FROM %I.returns r WHERE r.id = $1',
    p_schema
  ) INTO v_return_row
  USING v_return_id;

  RETURN v_return_row;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. create_adjustment_txn
--
-- NOTE: The adjustments module uses a single-row-per-item design with columns:
--   commodity_id, unit_id, quantity, reason_id (FK to adjustment_reasons).
-- There is no separate adjustment_items table.
-- p_input->'items' is an array of { commodity_id, unit_id, quantity, reason_id }.
-- Each element maps to one row in adjustments.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_adjustment_txn(
  p_schema  TEXT,
  p_input   JSONB,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment_number TEXT;
  v_adjustment_id     UUID;
  v_first_id          UUID;
  v_item              JSONB;
  v_result            JSONB;
BEGIN
  -- Each adjustment item gets its own sequence number and row.
  -- Return a JSONB array of all inserted adjustment rows.
  v_result := '[]'::JSONB;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_input->'items')
  LOOP
    v_adjustment_number := get_next_sequence(p_schema, 'adjustment');

    EXECUTE format(
      'INSERT INTO %I.adjustments (
         adjustment_number, location_id, commodity_id, unit_id,
         reason_id, quantity, notes, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id',
      p_schema
    ) INTO v_adjustment_id
    USING
      v_adjustment_number,
      (p_input->>'location_id')::UUID,
      (v_item->>'commodity_id')::UUID,
      (v_item->>'unit_id')::UUID,
      (v_item->>'reason_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      COALESCE(v_item->>'notes', p_input->>'notes'),
      p_user_id::UUID;

    -- Track first id for audit log
    IF v_first_id IS NULL THEN
      v_first_id := v_adjustment_id;
    END IF;

    -- Append to result array
    EXECUTE format(
      'SELECT $1 || to_jsonb(a) FROM %I.adjustments a WHERE a.id = $2',
      p_schema
    ) INTO v_result
    USING v_result, v_adjustment_id;
  END LOOP;

  -- Audit log (reference first adjustment id; metadata holds full input)
  EXECUTE format(
    'INSERT INTO %I.audit_log (user_id, action, entity_type, entity_id, new_data)
     VALUES ($1, ''created'', ''adjustment'', $2, $3)',
    p_schema
  ) USING p_user_id::UUID, v_first_id, p_input;

  RETURN v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. receive_dispatch_txn
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION receive_dispatch_txn(
  p_schema      TEXT,
  p_dispatch_id UUID,
  p_items       JSONB,
  p_user_id     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status       TEXT;
  v_dispatch_row JSONB;
  v_item         JSONB;
BEGIN
  -- Verify dispatch exists and is in 'dispatched' status
  EXECUTE format(
    'SELECT status FROM %I.dispatches WHERE id = $1 AND deleted_at IS NULL',
    p_schema
  ) INTO v_status
  USING p_dispatch_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Dispatch % not found', p_dispatch_id;
  END IF;

  IF v_status != 'dispatched' THEN
    RAISE EXCEPTION 'Dispatch % cannot be received: current status is %', p_dispatch_id, v_status;
  END IF;

  -- Batch update dispatch_items with received quantities
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    EXECUTE format(
      'UPDATE %I.dispatch_items
       SET received_quantity = $1, received_bags = $2
       WHERE id = $3 AND dispatch_id = $4',
      p_schema
    ) USING
      (v_item->>'received_quantity')::NUMERIC,
      (v_item->>'received_bags')::INT,
      (v_item->>'id')::UUID,
      p_dispatch_id;
  END LOOP;

  -- Update dispatch header
  EXECUTE format(
    'UPDATE %I.dispatches
     SET status = ''received'', received_at = now(), received_by = $1, updated_at = now()
     WHERE id = $2',
    p_schema
  ) USING p_user_id::UUID, p_dispatch_id;

  -- Audit log
  EXECUTE format(
    'INSERT INTO %I.audit_log (user_id, action, entity_type, entity_id, new_data)
     VALUES ($1, ''received'', ''dispatch'', $2, $3)',
    p_schema
  ) USING p_user_id::UUID, p_dispatch_id, p_items;

  -- Return updated dispatch
  EXECUTE format(
    'SELECT to_jsonb(d) FROM %I.dispatches d WHERE d.id = $1',
    p_schema
  ) INTO v_dispatch_row
  USING p_dispatch_id;

  RETURN v_dispatch_row;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permissions: restrict all functions to service_role only
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION create_dispatch_txn(TEXT, JSONB, TEXT)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_purchase_txn(TEXT, JSONB, TEXT)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_sale_txn(TEXT, JSONB, TEXT)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_return_txn(TEXT, JSONB, TEXT)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_adjustment_txn(TEXT, JSONB, TEXT)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION receive_dispatch_txn(TEXT, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_dispatch_txn(TEXT, JSONB, TEXT)     TO service_role;
GRANT EXECUTE ON FUNCTION create_purchase_txn(TEXT, JSONB, TEXT)     TO service_role;
GRANT EXECUTE ON FUNCTION create_sale_txn(TEXT, JSONB, TEXT)         TO service_role;
GRANT EXECUTE ON FUNCTION create_return_txn(TEXT, JSONB, TEXT)       TO service_role;
GRANT EXECUTE ON FUNCTION create_adjustment_txn(TEXT, JSONB, TEXT)   TO service_role;
GRANT EXECUTE ON FUNCTION receive_dispatch_txn(TEXT, UUID, JSONB, TEXT) TO service_role;
