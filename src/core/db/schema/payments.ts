import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  paymentNumber: text('payment_number'),
  type: text('type', { enum: ['purchase', 'sale'] }).notNull(),
  referenceId: uuid('reference_id'),
  amount: numeric('amount').notNull(),
  paymentMethod: text('payment_method'),
  paymentDate: timestamp('payment_date', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('payments_tenant_id_idx').on(table.tenantId),
  index('payments_tenant_reference_idx').on(table.tenantId, table.referenceId),
]);
