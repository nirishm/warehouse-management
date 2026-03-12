import { pgTable, uuid, text, boolean, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const customFieldDefinitions = pgTable('custom_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  entityType: text('entity_type', { enum: ['item', 'contact', 'sale', 'purchase', 'transfer'] }).notNull(),
  fieldName: text('field_name').notNull(),
  fieldType: text('field_type', { enum: ['text', 'number', 'date', 'boolean', 'select'] }).notNull(),
  options: jsonb('options'),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('custom_field_definitions_tenant_id_idx').on(table.tenantId),
]);
