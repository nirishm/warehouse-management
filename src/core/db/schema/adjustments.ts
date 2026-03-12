import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { locations } from './locations';
import { items } from './items';
import { units } from './units';

export const adjustments = pgTable('adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  adjustmentNumber: text('adjustment_number'),
  locationId: uuid('location_id').references(() => locations.id),
  reason: text('reason'),
  type: text('type', { enum: ['qty', 'value'] }).notNull(),
  status: text('status', { enum: ['draft', 'approved'] }).notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('adjustments_tenant_id_idx').on(table.tenantId),
]);

export const adjustmentItems = pgTable('adjustment_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  adjustmentId: uuid('adjustment_id').notNull().references(() => adjustments.id),
  itemId: uuid('item_id').notNull().references(() => items.id),
  unitId: uuid('unit_id').references(() => units.id),
  qtyChange: numeric('qty_change'),
  valueChange: numeric('value_change'),
}, (table) => [
  index('adjustment_items_adjustment_id_idx').on(table.adjustmentId),
]);
