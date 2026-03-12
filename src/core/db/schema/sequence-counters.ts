import { pgTable, uuid, text, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const sequenceCounters = pgTable('sequence_counters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  sequenceId: text('sequence_id').notNull(),
  currentValue: integer('current_value').notNull().default(0),
  prefix: text('prefix'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('sequence_counters_tenant_seq_unique').on(table.tenantId, table.sequenceId),
]);
