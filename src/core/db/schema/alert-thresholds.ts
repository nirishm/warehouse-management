import { pgTable, uuid, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { items } from './items';
import { locations } from './locations';

export const alertThresholds = pgTable('alert_thresholds', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').notNull().references(() => items.id),
  locationId: uuid('location_id').references(() => locations.id),
  minQuantity: numeric('min_quantity').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('alert_thresholds_tenant_id_idx').on(table.tenantId),
  index('alert_thresholds_tenant_item_idx').on(table.tenantId, table.itemId),
]);
