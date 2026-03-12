import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { locations } from './locations';

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  displayName: text('display_name'),
  phone: text('phone'),
  permissions: jsonb('permissions'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('user_profiles_tenant_id_idx').on(table.tenantId),
  index('user_profiles_tenant_user_idx').on(table.tenantId, table.userId),
]);

export const userLocations = pgTable('user_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  locationId: uuid('location_id').notNull().references(() => locations.id),
}, (table) => [
  index('user_locations_tenant_user_idx').on(table.tenantId, table.userId),
]);
