import { pgTable, uuid, text, numeric, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { contacts } from './contacts';
import { locations } from './locations';
import { items } from './items';
import { units } from './units';

export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  saleNumber: text('sale_number'),
  contactId: uuid('contact_id').references(() => contacts.id),
  locationId: uuid('location_id').references(() => locations.id),
  status: text('status', { enum: ['draft', 'confirmed', 'dispatched', 'cancelled'] }).notNull().default('draft'),
  shippingAddress: text('shipping_address'),
  trackingNumber: text('tracking_number'),
  customStatus: text('custom_status'),
  notes: text('notes'),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('sales_tenant_id_idx').on(table.tenantId),
  index('sales_tenant_status_idx').on(table.tenantId, table.status),
]);

export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').notNull().references(() => sales.id),
  itemId: uuid('item_id').notNull().references(() => items.id),
  unitId: uuid('unit_id').references(() => units.id),
  quantity: numeric('quantity').notNull(),
  unitPrice: numeric('unit_price').notNull(),
}, (table) => [
  index('sale_items_sale_id_idx').on(table.saleId),
]);
