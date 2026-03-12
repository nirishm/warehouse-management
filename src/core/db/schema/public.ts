import { pgTable, uuid, text, boolean, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['active', 'suspended', 'archived'] }).notNull().default('active'),
  enabledModules: jsonb('enabled_modules').default(['inventory']),
  plan: text('plan', { enum: ['free', 'starter', 'professional', 'enterprise'] }).notNull().default('free'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userTenants = pgTable('user_tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  role: text('role', { enum: ['owner', 'admin', 'manager', 'operator', 'viewer'] }).notNull().default('viewer'),
  isDefault: boolean('is_default').notNull().default(false),
}, (table) => [
  uniqueIndex('user_tenants_user_tenant_unique').on(table.userId, table.tenantId),
]);

export const superAdmins = pgTable('super_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
});
