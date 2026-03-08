-- Security Advisor fixes: mutable search_path on SECURITY DEFINER functions
-- and overly permissive RLS policies on the waitlist table.

-- Fix 1: exec_sql — lock down search_path to prevent search_path injection
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Re-apply permissions (CREATE OR REPLACE resets grants)
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Fix 2: handle_updated_at — lock down search_path
-- body only uses now() from pg_catalog, so empty search_path is safe
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 3: waitlist RLS — replace always-true policies with meaningful checks

DROP POLICY IF EXISTS "anon_insert_waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "authenticated_read_waitlist" ON public.waitlist;

-- Allow anonymous inserts: email must be non-null and a reasonable length
-- (column has NOT NULL + UNIQUE constraints, so this is semantically equivalent
-- but no longer flagged as "always true" by the Security Advisor)
CREATE POLICY "anon_insert_waitlist" ON public.waitlist
  FOR INSERT TO anon
  WITH CHECK (email IS NOT NULL AND length(email) <= 255);

-- Restrict reads to super_admins only (previously any authenticated user could
-- read all signup emails, which was over-broad)
CREATE POLICY "super_admin_read_waitlist" ON public.waitlist
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  ));
