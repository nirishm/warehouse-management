import { pgTable, uuid, text, numeric, integer, boolean, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { units } from './units';

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  code: text('code'),
  sku: text('sku'),
  description: text('description'),
  category: text('category'),
  type: text('type', { enum: ['goods', 'service', 'composite'] }).notNull().default('goods'),
  defaultUnitId: uuid('default_unit_id').references(() => units.id),
  purchasePrice: numeric('purchase_price'),
  sellingPrice: numeric('selling_price'),
  hsnCode: text('hsn_code'),
  imageUrl: text('image_url'),
  tags: text('tags').array(),
  reorderLevel: integer('reorder_level'),
  shelfLifeDays: integer('shelf_life_days'),
  isActive: boolean('is_active').notNull().default(true),
  customFields: jsonb('custom_fields'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('items_tenant_code_unique').on(table.tenantId, table.code).where(sql`${table.deletedAt} IS NULL`),
  index('items_tenant_id_idx').on(table.tenantId),
]);
