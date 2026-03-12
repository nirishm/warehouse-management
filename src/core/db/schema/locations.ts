import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const locations: any = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  code: text('code'),
  type: text('type', { enum: ['warehouse', 'store', 'yard', 'external'] }).notNull().default('warehouse'),
  address: text('address'),
  geoPoint: jsonb('geo_point'),
  capacity: integer('capacity'),
  // Self-referential FK: parent location for hierarchy
  parentLocationId: uuid('parent_location_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('locations_tenant_id_idx').on(table.tenantId),
]);
