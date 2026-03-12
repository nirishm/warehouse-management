-- Dedicated dashboard PG functions — replaces exec_sql usage in dashboard.ts
-- Each function uses format('%I', p_schema) for the schema identifier (safe)
-- and $N placeholders for all values (parameterized, no interpolation).

-- ── 1. dashboard_kpis ────────────────────────────────────────────────────────
-- Returns movements count and active alerts count for KPI cards.
-- Stock totals and active location counts are handled by the tenant client in TS.

CREATE OR REPLACE FUNCTION public.dashboard_kpis(
  p_schema        TEXT,
  p_date_from     TIMESTAMPTZ,
  p_date_to       TIMESTAMPTZ,
  p_location_ids  UUID[]        -- NULL means "all locations"
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE format(
    $sql$
    SELECT jsonb_build_object(
      'movements_in_range', (
        (SELECT COUNT(*)::int FROM %I.dispatches
         WHERE deleted_at IS NULL
           AND created_at >= $1 AND created_at <= $2
           AND ($3::uuid[] IS NULL OR origin_location_id = ANY($3)))
        +
        (SELECT COUNT(*)::int FROM %I.purchases
         WHERE deleted_at IS NULL
           AND created_at >= $1 AND created_at <= $2
           AND ($3::uuid[] IS NULL OR location_id = ANY($3)))
        +
        (SELECT COUNT(*)::int FROM %I.sales
         WHERE deleted_at IS NULL
           AND created_at >= $1 AND created_at <= $2
           AND ($3::uuid[] IS NULL OR location_id = ANY($3)))
      ),
      'active_alerts', (
        SELECT COUNT(*)::int
        FROM %I.stock_alert_thresholds t
        JOIN %I.commodities c ON c.id = t.commodity_id AND c.deleted_at IS NULL
        JOIN %I.locations l ON l.id = t.location_id AND l.deleted_at IS NULL
        LEFT JOIN %I.stock_levels sl
          ON sl.commodity_id = t.commodity_id
         AND sl.location_id  = t.location_id
         AND sl.unit_id      = t.unit_id
        WHERE t.is_active = true
          AND COALESCE(sl.current_stock, 0) <= t.reorder_point
          AND ($3::uuid[] IS NULL OR t.location_id = ANY($3))
      )
    )
    $sql$,
    -- schema references (7 × %I)
    p_schema, p_schema, p_schema,
    p_schema, p_schema, p_schema, p_schema
  )
  INTO result
  USING p_date_from, p_date_to, p_location_ids;

  RETURN result;
END;
$$;

-- ── 2. dashboard_recent_transactions ────────────────────────────────────────
-- Returns UNION ALL of recent dispatches / purchases / sales, ordered by date.

CREATE OR REPLACE FUNCTION public.dashboard_recent_transactions(
  p_schema        TEXT,
  p_date_from     TIMESTAMPTZ,
  p_date_to       TIMESTAMPTZ,
  p_location_ids  UUID[],        -- NULL means "all locations"
  p_commodity_id  UUID,          -- NULL means "all commodities"
  p_limit         INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE format(
    $sql$
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    FROM (
      (
        SELECT
          d.id,
          'dispatch'::text AS type,
          d.dispatch_number AS number,
          d.status,
          COALESCE(d.dispatched_at, d.created_at) AS date,
          c.name  AS commodity_name,
          i.sent_quantity AS quantity,
          u.abbreviation  AS unit,
          l.name  AS location_name
        FROM %I.dispatches d
        JOIN %I.dispatch_items i ON i.dispatch_id = d.id
        JOIN %I.commodities c    ON c.id = i.commodity_id
        JOIN %I.units u          ON u.id = i.unit_id
        JOIN %I.locations l      ON l.id = d.origin_location_id
        WHERE d.deleted_at IS NULL
          AND d.created_at >= $1 AND d.created_at <= $2
          AND ($3::uuid[] IS NULL OR d.origin_location_id = ANY($3))
          AND ($4::uuid  IS NULL OR i.commodity_id = $4)
      )
      UNION ALL
      (
        SELECT
          t.id,
          'purchase'::text AS type,
          t.purchase_number AS number,
          t.status,
          COALESCE(t.received_at, t.created_at) AS date,
          c.name  AS commodity_name,
          i.quantity,
          u.abbreviation  AS unit,
          l.name  AS location_name
        FROM %I.purchases t
        JOIN %I.purchase_items i ON i.purchase_id = t.id
        JOIN %I.commodities c    ON c.id = i.commodity_id
        JOIN %I.units u          ON u.id = i.unit_id
        JOIN %I.locations l      ON l.id = t.location_id
        WHERE t.deleted_at IS NULL
          AND t.created_at >= $1 AND t.created_at <= $2
          AND ($3::uuid[] IS NULL OR t.location_id = ANY($3))
          AND ($4::uuid  IS NULL OR i.commodity_id = $4)
      )
      UNION ALL
      (
        SELECT
          t.id,
          'sale'::text AS type,
          t.sale_number AS number,
          t.status,
          COALESCE(t.sold_at, t.created_at) AS date,
          c.name  AS commodity_name,
          i.quantity,
          u.abbreviation  AS unit,
          l.name  AS location_name
        FROM %I.sales t
        JOIN %I.sale_items i ON i.sale_id = t.id
        JOIN %I.commodities c ON c.id = i.commodity_id
        JOIN %I.units u       ON u.id = i.unit_id
        JOIN %I.locations l   ON l.id = t.location_id
        WHERE t.deleted_at IS NULL
          AND t.created_at >= $1 AND t.created_at <= $2
          AND ($3::uuid[] IS NULL OR t.location_id = ANY($3))
          AND ($4::uuid  IS NULL OR i.commodity_id = $4)
      )
      ORDER BY date DESC
      LIMIT $5
    ) t
    $sql$,
    -- schema references (15 × %I)
    p_schema, p_schema, p_schema, p_schema, p_schema,
    p_schema, p_schema, p_schema, p_schema, p_schema,
    p_schema, p_schema, p_schema, p_schema, p_schema
  )
  INTO result
  USING p_date_from, p_date_to, p_location_ids, p_commodity_id, p_limit;

  RETURN result;
END;
$$;

-- ── 3. dashboard_stock_by_location ──────────────────────────────────────────
-- Returns stock summary grouped by location.

CREATE OR REPLACE FUNCTION public.dashboard_stock_by_location(
  p_schema        TEXT,
  p_location_ids  UUID[],   -- NULL means "all locations"
  p_commodity_id  UUID      -- NULL means "all commodities"
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE format(
    $sql$
    SELECT COALESCE(jsonb_agg(row_to_json(q)), '[]'::jsonb)
    FROM (
      SELECT
        l.id   AS location_id,
        l.name AS location_name,
        l.code AS location_code,
        COALESCE(SUM(sl.current_stock), 0)          AS total_stock,
        COUNT(DISTINCT sl.commodity_id)::int         AS commodity_count,
        CASE WHEN COUNT(t.id) > 0 THEN true ELSE false END AS has_shortage
      FROM %I.locations l
      LEFT JOIN %I.stock_levels sl
        ON sl.location_id = l.id
       AND ($2::uuid IS NULL OR sl.commodity_id = $2)
      LEFT JOIN %I.stock_alert_thresholds t
        ON t.location_id = l.id AND t.is_active = true
       AND EXISTS (
         SELECT 1 FROM %I.stock_levels sl2
         WHERE sl2.commodity_id = t.commodity_id
           AND sl2.location_id  = t.location_id
           AND sl2.unit_id      = t.unit_id
           AND sl2.current_stock <= t.reorder_point
       )
      WHERE l.deleted_at IS NULL AND l.is_active = true
        AND ($1::uuid[] IS NULL OR l.id = ANY($1))
      GROUP BY l.id, l.name, l.code
      ORDER BY total_stock DESC
    ) q
    $sql$,
    -- schema references (4 × %I)
    p_schema, p_schema, p_schema, p_schema
  )
  INTO result
  USING p_location_ids, p_commodity_id;

  RETURN result;
END;
$$;

-- ── 4. dashboard_shortage_alerts ────────────────────────────────────────────
-- Returns commodities at or below their reorder point.

CREATE OR REPLACE FUNCTION public.dashboard_shortage_alerts(
  p_schema        TEXT,
  p_location_ids  UUID[],   -- NULL means "all locations"
  p_limit         INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE format(
    $sql$
    SELECT COALESCE(jsonb_agg(row_to_json(q)), '[]'::jsonb)
    FROM (
      SELECT
        t.id AS threshold_id,
        c.name AS commodity_name,
        c.code AS commodity_code,
        l.name AS location_name,
        COALESCE(sl.current_stock, 0) AS current_stock,
        t.min_stock,
        t.reorder_point,
        u.abbreviation AS unit_abbreviation,
        CASE
          WHEN COALESCE(sl.current_stock, 0) <= t.min_stock THEN 'CRITICAL'
          ELSE 'WARNING'
        END AS severity
      FROM %I.stock_alert_thresholds t
      JOIN %I.commodities c ON c.id = t.commodity_id AND c.deleted_at IS NULL
      JOIN %I.locations l   ON l.id = t.location_id  AND l.deleted_at IS NULL
      JOIN %I.units u       ON u.id = t.unit_id
      LEFT JOIN %I.stock_levels sl
        ON sl.commodity_id = t.commodity_id
       AND sl.location_id  = t.location_id
       AND sl.unit_id      = t.unit_id
      WHERE t.is_active = true
        AND COALESCE(sl.current_stock, 0) <= t.reorder_point
        AND ($1::uuid[] IS NULL OR t.location_id = ANY($1))
      ORDER BY
        CASE WHEN COALESCE(sl.current_stock, 0) <= t.min_stock THEN 0 ELSE 1 END,
        COALESCE(sl.current_stock, 0) ASC
      LIMIT $2
    ) q
    $sql$,
    -- schema references (5 × %I)
    p_schema, p_schema, p_schema, p_schema, p_schema
  )
  INTO result
  USING p_location_ids, p_limit;

  RETURN result;
END;
$$;

-- ── Permissions ─────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.dashboard_kpis(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_kpis(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[])
  TO service_role;

REVOKE ALL ON FUNCTION public.dashboard_recent_transactions(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[], UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_recent_transactions(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[], UUID, INTEGER)
  TO service_role;

REVOKE ALL ON FUNCTION public.dashboard_stock_by_location(TEXT, UUID[], UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_stock_by_location(TEXT, UUID[], UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.dashboard_shortage_alerts(TEXT, UUID[], INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_shortage_alerts(TEXT, UUID[], INTEGER)
  TO service_role;
