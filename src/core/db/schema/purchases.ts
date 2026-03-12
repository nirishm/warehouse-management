import { pgTable, uuid, text, numeric, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { contacts } from './contacts';
import { locations } from './locations';
import { items } from './items';
import { units } from './units';

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  purchaseNumber: text('purchase_number'),
  contactId: uuid('contact_id').references(() => contacts.id),
  locationId: uuid('location_id').references(() => locations.id),
  status: text('status', { enum: ['draft', 'ordered', 'received', 'cancelled'] }).notNull().default('draft'),
  expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),
  notes: text('notes'),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('purchases_tenant_id_idx').on(table.tenantId),
  index('purchases_tenant_status_idx').on(table.tenantId, table.status),
]);

export const purchaseItems = pgTable('purchase_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseId: uuid('purchase_id').notNull().references(() => purchases.id),
  itemId: uuid('item_id').notNull().references(() => items.id),
  unitId: uuid('unit_id').references(() => units.id),
  quantity: numeric('quantity').notNull(),
  unitPrice: numeric('unit_price').notNull(),
}, (table) => [
  index('purchase_items_purchase_id_idx').on(table.purchaseId),
]);
