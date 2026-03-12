-- Safe DDL executor (for tenant provisioning + module migrations)
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE query;
  RETURN '[]'::JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- Parameterized sequence increment (replaces string-interpolated SQL in tenant-query.ts)
-- Uses format() with %I for schema name — safe from SQL injection
CREATE OR REPLACE FUNCTION get_next_sequence(p_schema TEXT, p_seq_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  EXECUTE format(
    'UPDATE %I.sequence_counters SET current_value = current_value + 1
     WHERE id = $1
     RETURNING prefix || ''-'' || LPAD(current_value::TEXT, 6, ''0'')',
    p_schema
  ) INTO result USING p_seq_id;
  RETURN result;
END;
$$;

-- Restrict function access to service_role only
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_next_sequence(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_next_sequence(TEXT, TEXT) TO service_role;
