import { pgTable, uuid, text, numeric, integer, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  type: text('type', { enum: ['supplier', 'customer', 'both'] }).notNull(),
  email: text('email'),
  phone: text('phone'),
  gstNumber: text('gst_number'),
  address: text('address'),
  creditLimit: numeric('credit_limit'),
  paymentTerms: integer('payment_terms'),
  customFields: jsonb('custom_fields'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('contacts_tenant_id_idx').on(table.tenantId),
]);
