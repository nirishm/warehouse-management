import { db } from '@/core/db/drizzle';
import { sql } from 'drizzle-orm';
import { TENANT_A_ID, TENANT_B_ID, USERS } from './test-data';

// Drizzle's sql tag passes JS arrays as a tuple ($1, $2), not a Postgres array.
// Use OR conditions instead of ANY() to avoid type mismatch.
const tenantFilter = sql`(tenant_id = ${TENANT_A_ID} OR tenant_id = ${TENANT_B_ID})`;

/**
 * Hard-deletes ALL test data for both tenant A and B in reverse FK order.
 * Uses raw SQL DELETE so it works even if a table lacks deletedAt.
 */
export async function cleanupAllTestData(): Promise<void> {
  // Step 1: Line items — linked via parent FK (no direct tenantId)
  await db.execute(sql`
    DELETE FROM purchase_items
    WHERE purchase_id IN (
      SELECT id FROM purchases WHERE ${tenantFilter}
    )
  `);
  await db.execute(sql`
    DELETE FROM sale_items
    WHERE sale_id IN (
      SELECT id FROM sales WHERE ${tenantFilter}
    )
  `);
  await db.execute(sql`
    DELETE FROM transfer_items
    WHERE transfer_id IN (
      SELECT id FROM transfers WHERE ${tenantFilter}
    )
  `);
  await db.execute(sql`
    DELETE FROM adjustment_items
    WHERE adjustment_id IN (
      SELECT id FROM adjustments WHERE ${tenantFilter}
    )
  `);

  // Step 2: Audit log and sequence counters (before transactions)
  await db.execute(sql`DELETE FROM audit_log WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM sequence_counters WHERE ${tenantFilter}`);

  // Step 3: Transaction tables
  await db.execute(sql`DELETE FROM payments WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM purchases WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM sales WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM transfers WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM adjustments WHERE ${tenantFilter}`);

  // Step 4: Alert thresholds and custom field definitions
  await db.execute(sql`DELETE FROM alert_thresholds WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM custom_field_definitions WHERE ${tenantFilter}`);

  // Step 5: User associations
  await db.execute(sql`DELETE FROM user_locations WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM user_profiles WHERE ${tenantFilter}`);

  // Step 6: Master data
  await db.execute(sql`DELETE FROM items WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM contacts WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM locations WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM units WHERE ${tenantFilter}`);

  // Step 7: User-tenant memberships and access requests
  await db.execute(sql`DELETE FROM user_tenants WHERE ${tenantFilter}`);
  await db.execute(sql`DELETE FROM access_requests WHERE ${tenantFilter}`);

  // Step 8: Tenants (last, parent of everything)
  await db.execute(sql`
    DELETE FROM tenants WHERE id = ${TENANT_A_ID} OR id = ${TENANT_B_ID}
  `);

  // Step 9: Auth users (after all references are removed)
  const userIds = Object.values(USERS).map((u) => u.id);
  for (const userId of userIds) {
    await db.execute(sql`DELETE FROM auth.users WHERE id = ${userId}::uuid`);
  }
}
