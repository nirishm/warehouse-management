// File: tests/backend/setup/test-env.ts
// Purpose: Supabase client setup for backend tests — service role + anon clients
// Runner: Vitest (node environment)

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://elmfdrflziuicgnmmcig.supabase.co';

export const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbWZkcmZseml1aWNnbm1tY2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg4NTEyMSwiZXhwIjoyMDg4NDYxMTIxfQ.I25R8FrrxGPEVzmBElEhhwMphDlSCJ7eC8H4pYQ274A';

export const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbWZkcmZseml1aWNnbm1tY2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4ODUxMjEsImV4cCI6MjA4ODQ2MTEyMX0.BN-8lgqepFtbtFEflV3u41oRpLspeapQxoS6T5M239c';

export const APP_URL = 'http://localhost:3000';

/**
 * Service-role client scoped to the public schema.
 * Bypasses RLS — use for setup/teardown and schema introspection only.
 */
export const serviceClient: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false },
});

/**
 * Anon client (no auth bearer). Used to verify RLS policies block unauthenticated access.
 */
export const anonClient: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false },
});

/**
 * Returns a service-role client scoped to a specific tenant schema.
 * Used for direct tenant data access in tests (schema introspection, seed, teardown).
 */
export function tenantClient(schemaName: string): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: schemaName },
    auth: { persistSession: false },
  });
}

/**
 * Returns an anon client scoped to a specific tenant schema.
 * Used to verify that unauthenticated access to tenant data is blocked.
 */
export function anonTenantClient(schemaName: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    db: { schema: schemaName },
    auth: { persistSession: false },
  });
}

// Both exec_sql and get_next_sequence RPCs exist in the public schema (confirmed via live DB).
export const EXEC_SQL_RPC_EXISTS = true;
export const GET_NEXT_SEQUENCE_RPC_EXISTS = true;

// Known test tenant discovered via live DB introspection
export const TEST_TENANT = {
  id: '0bca14d9-5b50-4620-86e3-654613cb41da',
  name: 'Test Warehouse',
  slug: 'test-warehouse',
  schema_name: 'tenant_test_warehouse',
  status: 'active',
  plan: 'free',
} as const;

// Known seed data IDs from tenant_demo (deterministic fixture data)
export const DEMO_LOCATIONS = {
  WH_NORTH: 'a0000001-0000-0000-0000-000000000001',
  YD_SOUTH: 'a0000001-0000-0000-0000-000000000002',
  ST_CITY: 'a0000001-0000-0000-0000-000000000003',
} as const;

export const DEMO_COMMODITIES = {
  WHEAT: 'b0000001-0000-0000-0000-000000000001',
  RICE: 'b0000001-0000-0000-0000-000000000002',
  CORN: 'b0000001-0000-0000-0000-000000000003',
} as const;

export const DEMO_PURCHASES = {
  PUR_001: 'd0000001-0000-0000-0000-000000000001',
  PUR_002: 'd0000001-0000-0000-0000-000000000002',
  PUR_003: 'd0000001-0000-0000-0000-000000000003',
  PUR_004: 'd0000001-0000-0000-0000-000000000004',
} as const;

export const DEMO_DISPATCHES = {
  DSP_001: 'f0000001-0000-0000-0000-000000000001', // received
  DSP_002: 'f0000001-0000-0000-0000-000000000002', // in_transit
  DSP_003: 'f0000001-0000-0000-0000-000000000003', // dispatched
  DSP_004: 'f0000001-0000-0000-0000-000000000004', // draft
  DSP_005: 'f0000001-0000-0000-0000-000000000005', // received
  DSP_006: 'f0000001-0000-0000-0000-000000000006', // cancelled
} as const;

export const DEMO_SALES = {
  SAL_001: 'e0000001-0000-0000-0000-000000000001', // dispatched
  SAL_002: 'e0000001-0000-0000-0000-000000000002', // confirmed
  SAL_003: 'e0000001-0000-0000-0000-000000000003', // confirmed
  SAL_004: 'e0000001-0000-0000-0000-000000000004', // draft
} as const;

// ---------------------------------------------------------------------------
// test-warehouse tenant fixture data (live DB — tenant_test_warehouse schema)
// ---------------------------------------------------------------------------
export const TW_LOCATIONS = {
  LOC1: '2e2f5e11-e29e-4408-8cf9-4241270d8d80', // Main Warehouse
  LOC2: '06a475bf-dd07-48e7-b09d-64944ddebdf8', // City Store
  LOC3: '676104b5-aba7-4af1-85b9-ed79e3753253', // Loading Yard
} as const;

export const TW_COMMODITIES = {
  COMM1: 'cd1eca66-3a1f-45ed-b779-37a35bd04a27', // Wheat Grade A
  COMM2: 'b2187ae8-e631-4aec-a5ee-9bd3cac65aa2', // Rice Basmati
} as const;

export const TW_UNIT_KG = '28930e00-a69f-4b1e-a500-1b25d7382644';

// Which optional-module tables exist in tenant_test_warehouse (confirmed via live DB)
export const MODULE_TABLES = {
  returns: true,
  lots: true,
  payments: true,
  stockAlerts: true,
  adjustments: true,
} as const;
