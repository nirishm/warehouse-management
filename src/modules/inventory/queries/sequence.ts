import { db } from '@/core/db/drizzle';
import { sql } from 'drizzle-orm';

/**
 * Atomically increments and returns the next sequence number for a given
 * tenant + sequenceId pair. Uses INSERT ON CONFLICT DO UPDATE to ensure
 * the counter is upserted and incremented in one atomic statement.
 *
 * Returns a formatted string like "ITM-000001".
 */
export async function getNextSequence(
  tenantId: string,
  sequenceId: string,
  prefix?: string,
): Promise<string> {
  const result = await db.execute(sql`
    INSERT INTO sequence_counters (tenant_id, sequence_id, current_value, prefix)
    VALUES (${tenantId}, ${sequenceId}, 1, ${prefix ?? sequenceId})
    ON CONFLICT (tenant_id, sequence_id)
    DO UPDATE SET
      current_value = sequence_counters.current_value + 1,
      updated_at = now()
    RETURNING current_value, prefix
  `);

  const row = (result as unknown as Record<string, unknown>[])[0];
  const value = Number(row.current_value);
  const pre = (row.prefix as string) || sequenceId;
  return `${pre}-${String(value).padStart(6, '0')}`;
}
