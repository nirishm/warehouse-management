-- Fix exec_sql to return SELECT query results as JSONB
-- Previously it only executed DDL/DML and always returned '[]'::jsonb,
-- which broke all modules using it for SELECT queries (alerts, payments, lots, dashboard).
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Try to execute as a query that returns rows (SELECT)
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query || ') t'
    INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- If wrapping in SELECT fails (DDL/DML), execute directly
  BEGIN
    EXECUTE query;
    RETURN '[]'::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
  END;
END;
$$;
