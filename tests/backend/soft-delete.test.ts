import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock Inngest BEFORE any query module imports
vi.mock('@/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ['mock'] }) },
}));

import { db, schema, withTenantScope } from '../helpers/db';
import { eq, and } from 'drizzle-orm';
import * as factory from '../helpers/factories';
import { cleanupAllTestData } from '../helpers/cleanup';
import { TENANT_A_ID, TENANT_A_SLUG, UNITS, LOCATIONS, ITEMS } from '../helpers/test-data';
import { createItem, softDeleteItem, getItem, listItems } from '@/modules/inventory/queries/items';
import { createPurchase, softDeletePurchase, getPurchase, listPurchases } from '@/modules/purchase/queries/purchases';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000099';

beforeAll(async () => {
  await cleanupAllTestData();

  await factory.createTestTenant({
    id: TENANT_A_ID,
    name: 'Soft Delete Co',
    slug: TENANT_A_SLUG,
    enabledModules: ['inventory', 'purchases'],
    plan: 'starter',
  });

  await factory.createTestUnit({
    id: UNITS.piece.id,
    tenantId: TENANT_A_ID,
    name: UNITS.piece.name,
    abbreviation: UNITS.piece.abbreviation,
    type: UNITS.piece.type,
  });
  await factory.createTestLocation({
    id: LOCATIONS.alpha.id,
    tenantId: TENANT_A_ID,
    name: LOCATIONS.alpha.name,
    code: LOCATIONS.alpha.code,
    type: LOCATIONS.alpha.type,
  });

  for (const [, item] of Object.entries(ITEMS)) {
    await factory.createTestItem({
      id: item.id,
      tenantId: TENANT_A_ID,
      name: item.name,
      code: item.code,
      defaultUnitId: UNITS.piece.id,
    });
  }
});

afterAll(async () => {
  await cleanupAllTestData();
});

// ── Soft Delete Tests ─────────────────────────────────────────────────────────

describe('Soft Deletes', () => {
  describe('withTenantScope.query() excludes deleted rows', () => {
    it('soft-deleted item not returned by scope.query(items)', async () => {
      const item = await createItem(
        TENANT_A_ID,
        { name: 'Scope Delete Test Item' },
        TEST_USER_ID,
      );

      const scope = withTenantScope(db, TENANT_A_ID);
      const before = await scope.query(schema.items);
      const beforeIds = before.map((r) => r.id);
      expect(beforeIds).toContain(item.id);

      await softDeleteItem(TENANT_A_ID, item.id, TEST_USER_ID);

      const after = await scope.query(schema.items);
      const afterIds = after.map((r) => r.id);
      expect(afterIds).not.toContain(item.id);
    });

    it('non-deleted items remain in scope.query(items)', async () => {
      const item = await createItem(
        TENANT_A_ID,
        { name: 'Surviving Item' },
        TEST_USER_ID,
      );

      const toDelete = await createItem(
        TENANT_A_ID,
        { name: 'Item To Delete' },
        TEST_USER_ID,
      );

      await softDeleteItem(TENANT_A_ID, toDelete.id, TEST_USER_ID);

      const scope = withTenantScope(db, TENANT_A_ID);
      const rows = await scope.query(schema.items);
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(item.id);
      expect(ids).not.toContain(toDelete.id);

      // cleanup
      await softDeleteItem(TENANT_A_ID, item.id, TEST_USER_ID);
    });
  });

  describe('List functions exclude deleted', () => {
    it('listItems excludes soft-deleted', async () => {
      const item = await createItem(
        TENANT_A_ID,
        { name: 'List Exclusion Test Item' },
        TEST_USER_ID,
      );

      const { data: before } = await listItems(TENANT_A_ID);
      expect(before.some((i) => i.id === item.id)).toBe(true);

      await softDeleteItem(TENANT_A_ID, item.id, TEST_USER_ID);

      const { data: after } = await listItems(TENANT_A_ID);
      expect(after.some((i) => i.id === item.id)).toBe(false);
    });

    it('listPurchases excludes soft-deleted', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        {
          items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '1', unitPrice: '100.00' }],
        },
        TEST_USER_ID,
      );

      const { data: before } = await listPurchases(TENANT_A_ID);
      expect(before.some((p) => p.id === purchase.id)).toBe(true);

      await softDeletePurchase(TENANT_A_ID, purchase.id, TEST_USER_ID);

      const { data: after } = await listPurchases(TENANT_A_ID);
      expect(after.some((p) => p.id === purchase.id)).toBe(false);
    });
  });

  describe('Get functions return null for deleted', () => {
    it('getItem returns null for soft-deleted item', async () => {
      const item = await createItem(
        TENANT_A_ID,
        { name: 'GetItem Null Test' },
        TEST_USER_ID,
      );

      const before = await getItem(TENANT_A_ID, item.id);
      expect(before).not.toBeNull();

      await softDeleteItem(TENANT_A_ID, item.id, TEST_USER_ID);

      const after = await getItem(TENANT_A_ID, item.id);
      expect(after).toBeNull();
    });

    it('getPurchase returns null for soft-deleted purchase', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        {
          items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '1', unitPrice: '5.00' }],
        },
        TEST_USER_ID,
      );

      const before = await getPurchase(TENANT_A_ID, purchase.id);
      expect(before).not.toBeNull();

      await softDeletePurchase(TENANT_A_ID, purchase.id, TEST_USER_ID);

      const after = await getPurchase(TENANT_A_ID, purchase.id);
      expect(after).toBeNull();
    });
  });

  describe('Row still exists in DB', () => {
    it('direct SQL query finds the soft-deleted row with deletedAt set', async () => {
      const item = await createItem(
        TENANT_A_ID,
        { name: 'DB Exists Check Item' },
        TEST_USER_ID,
      );

      await softDeleteItem(TENANT_A_ID, item.id, TEST_USER_ID);

      // Raw query bypasses soft-delete filter
      const raw = await db
        .select()
        .from(schema.items)
        .where(
          and(
            eq(schema.items.id, item.id),
            eq(schema.items.tenantId, TENANT_A_ID),
          ),
        );

      expect(raw).toHaveLength(1);
      expect(raw[0].id).toBe(item.id);
      expect(raw[0].deletedAt).not.toBeNull();
    });
  });
});
