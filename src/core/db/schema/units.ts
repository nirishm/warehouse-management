import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const units: any = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation').notNull(),
  type: text('type', { enum: ['weight', 'volume', 'length', 'count', 'area'] }).notNull(),
  // Self-referential FK: base unit for unit conversion
  baseUnitId: uuid('base_unit_id'),
  conversionFactor: numeric('conversion_factor'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('units_tenant_id_idx').on(table.tenantId),
]);
