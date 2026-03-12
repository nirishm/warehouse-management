import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { locations } from './locations';
import { items } from './items';
import { units } from './units';

export const transfers = pgTable('transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  transferNumber: text('transfer_number'),
  originLocationId: uuid('origin_location_id').references(() => locations.id),
  destLocationId: uuid('dest_location_id').references(() => locations.id),
  status: text('status', { enum: ['draft', 'dispatched', 'in_transit', 'received'] }).notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('transfers_tenant_id_idx').on(table.tenantId),
  index('transfers_tenant_status_idx').on(table.tenantId, table.status),
]);

export const transferItems = pgTable('transfer_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferId: uuid('transfer_id').notNull().references(() => transfers.id),
  itemId: uuid('item_id').notNull().references(() => items.id),
  unitId: uuid('unit_id').references(() => units.id),
  sentQty: numeric('sent_qty').notNull(),
  receivedQty: numeric('received_qty'),
  // shortage is computed in application code (sentQty - receivedQty)
  shortage: numeric('shortage'),
}, (table) => [
  index('transfer_items_transfer_id_idx').on(table.transferId),
]);
