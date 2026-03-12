-- Transactional RPC functions for payments and lots
-- Fixes non-atomic sequence + insert (sequence consumed even if INSERT fails)
-- Both functions use SECURITY DEFINER and format('%I', p_schema) for safe schema injection.
-- Values are always passed via $N parameter binding, never string-interpolated.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. create_payment_txn
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_payment_txn(
  p_schema  TEXT,
  p_input   JSONB,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_number TEXT;
  v_payment_id     UUID;
  v_payment_row    JSONB;
BEGIN
  -- Get next sequence number
  v_payment_number := public.get_next_sequence(p_schema, 'payment');

  -- Insert payment
  EXECUTE format(
    'INSERT INTO %I.payments (
       payment_number, transaction_type, transaction_id, contact_id,
       amount, payment_date, payment_method, reference_number, notes, recorded_by
     ) VALUES ($1, $2, $3, $4, $5, COALESCE($6::TIMESTAMPTZ, now()), $7, $8, $9, $10)
     RETURNING id',
    p_schema
  ) INTO v_payment_id
  USING
    v_payment_number,
    p_input->>'transaction_type',
    (p_input->>'transaction_id')::UUID,
    NULLIF(p_input->>'contact_id', '')::UUID,
    (p_input->>'amount')::NUMERIC,
    NULLIF(p_input->>'payment_date', ''),
    COALESCE(NULLIF(p_input->>'payment_method', ''), 'cash'),
    NULLIF(p_input->>'reference_number', ''),
    NULLIF(p_input->>'notes', ''),
    p_user_id::UUID;

  -- Audit log
  EXECUTE format(
    'INSERT INTO %I.audit_log (user_id, action, entity_type, entity_id, new_data)
     VALUES ($1, ''created'', ''payment'', $2, $3)',
    p_schema
  ) USING p_user_id::UUID, v_payment_id, p_input;

  -- Return the inserted row
  EXECUTE format(
    'SELECT to_jsonb(p) FROM %I.payments p WHERE p.id = $1',
    p_schema
  ) INTO v_payment_row
  USING v_payment_id;

  RETURN v_payment_row;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. create_lot_txn
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_lot_txn(
  p_schema  TEXT,
  p_input   JSONB,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lot_number TEXT;
  v_lot_id     UUID;
  v_lot_row    JSONB;
BEGIN
  -- Use provided lot_number if non-empty, otherwise auto-generate
  v_lot_number := NULLIF(trim(COALESCE(p_input->>'lot_number', '')), '');
  IF v_lot_number IS NULL THEN
    v_lot_number := public.get_next_sequence(p_schema, 'lot');
  END IF;

  -- Insert lot
  EXECUTE format(
    'INSERT INTO %I.lots (
       lot_number, commodity_id, source_purchase_id,
       received_date, expiry_date, initial_quantity, unit_id, notes
     ) VALUES ($1, $2, $3, COALESCE($4::TIMESTAMPTZ, now()), $5::TIMESTAMPTZ, $6, $7, $8)
     RETURNING id',
    p_schema
  ) INTO v_lot_id
  USING
    v_lot_number,
    (p_input->>'commodity_id')::UUID,
    NULLIF(p_input->>'source_purchase_id', '')::UUID,
    NULLIF(p_input->>'received_date', ''),
    NULLIF(p_input->>'expiry_date', ''),
    (p_input->>'initial_quantity')::NUMERIC,
    (p_input->>'unit_id')::UUID,
    NULLIF(p_input->>'notes', '');

  -- Audit log
  EXECUTE format(
    'INSERT INTO %I.audit_log (user_id, action, entity_type, entity_id, new_data)
     VALUES ($1, ''created'', ''lot'', $2, $3)',
    p_schema
  ) USING p_user_id::UUID, v_lot_id, p_input;

  -- Return the inserted row
  EXECUTE format(
    'SELECT to_jsonb(l) FROM %I.lots l WHERE l.id = $1',
    p_schema
  ) INTO v_lot_row
  USING v_lot_id;

  RETURN v_lot_row;
END;
$$;
