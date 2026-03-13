import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock Inngest BEFORE any query module imports
vi.mock('@/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ['mock'] }) },
}));

import { db, schema } from '../helpers/db';
import { eq, and } from 'drizzle-orm';
import * as factory from '../helpers/factories';
import { cleanupAllTestData } from '../helpers/cleanup';
import { TENANT_A_ID, TENANT_A_SLUG, UNITS, LOCATIONS, ITEMS, CONTACTS } from '../helpers/test-data';
import { createItem, updateItem, softDeleteItem } from '@/modules/inventory/queries/items';
import { createPurchase, updatePurchaseStatus } from '@/modules/purchase/queries/purchases';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000099';

beforeAll(async () => {
  await cleanupAllTestData();

  // Minimal setup: tenant + master data
  await factory.createTestTenant({
    id: TENANT_A_ID,
    name: 'Audit Trail Co',
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
  await factory.createTestContact({
    id: CONTACTS.supplierA.id,
    tenantId: TENANT_A_ID,
    name: CONTACTS.supplierA.name,
    type: CONTACTS.supplierA.type,
  });
  // Items needed for purchase line items in audit tests
  await factory.createTestItem({
    id: ITEMS.widget.id,
    tenantId: TENANT_A_ID,
    name: ITEMS.widget.name,
    code: ITEMS.widget.code,
    defaultUnitId: UNITS.piece.id,
    purchasePrice: ITEMS.widget.purchasePrice,
    sellingPrice: ITEMS.widget.sellingPrice,
  });
  await factory.createTestItem({
    id: ITEMS.bolt.id,
    tenantId: TENANT_A_ID,
    name: ITEMS.bolt.name,
    code: ITEMS.bolt.code,
    defaultUnitId: UNITS.piece.id,
    purchasePrice: ITEMS.bolt.purchasePrice,
    sellingPrice: ITEMS.bolt.sellingPrice,
  });
});

afterAll(async () => {
  await cleanupAllTestData();
});

// Helper to query audit entries for a given entity
async function getAuditEntries(entityId: string) {
  return db
    .select()
    .from(schema.auditLog)
    .where(
      and(
        eq(schema.auditLog.entityId, entityId),
        eq(schema.auditLog.tenantId, TENANT_A_ID),
      ),
    );
}

// ── Audit Trail Tests ─────────────────────────────────────────────────────────

describe('Audit Trail', () => {
  it('createItem writes action=create, entityType=item, newData contains name', async () => {
    const item = await createItem(
      TENANT_A_ID,
      { name: 'Audit Test Widget', type: 'goods', defaultUnitId: UNITS.piece.id },
      TEST_USER_ID,
    );

    const entries = await getAuditEntries(item.id);
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.action).toBe('create');
    expect(entry.entityType).toBe('item');
    expect(entry.tenantId).toBe(TENANT_A_ID);
    expect(entry.userId).toBe(TEST_USER_ID);
    expect((entry.newData as Record<string, unknown>)?.name).toBe('Audit Test Widget');
    expect(entry.oldData).toBeNull();
  });

  it('updateItem writes action=update with oldData and newData', async () => {
    const item = await createItem(
      TENANT_A_ID,
      { name: 'Update Audit Item', type: 'goods' },
      TEST_USER_ID,
    );

    await updateItem(TENANT_A_ID, item.id, { name: 'Updated Name' }, TEST_USER_ID);

    const entries = await getAuditEntries(item.id);
    const updateEntry = entries.find((e) => e.action === 'update');
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.oldData).not.toBeNull();
    expect(updateEntry?.newData).not.toBeNull();
    expect((updateEntry?.oldData as Record<string, unknown>)?.name).toBe('Update Audit Item');
    expect((updateEntry?.newData as Record<string, unknown>)?.name).toBe('Updated Name');
  });

  it('softDeleteItem writes action=delete with oldData and null newData', async () => {
    const item = await createItem(
      TENANT_A_ID,
      { name: 'Delete Audit Item', type: 'goods' },
      TEST_USER_ID,
    );

    await softDeleteItem(TENANT_A_ID, item.id, TEST_USER_ID);

    const entries = await getAuditEntries(item.id);
    const deleteEntry = entries.find((e) => e.action === 'delete');
    expect(deleteEntry).toBeDefined();
    expect(deleteEntry?.oldData).not.toBeNull();
    expect((deleteEntry?.oldData as Record<string, unknown>)?.id).toBe(item.id);
    expect(deleteEntry?.newData).toBeNull();
  });

  it('createPurchase writes action=create, entityType=purchase', async () => {
    const purchase = await createPurchase(
      TENANT_A_ID,
      {
        contactId: CONTACTS.supplierA.id,
        locationId: LOCATIONS.alpha.id,
        items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '10', unitPrice: '100.00' }],
      },
      TEST_USER_ID,
    );

    const entries = await getAuditEntries(purchase.id);
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.action).toBe('create');
    expect(entry.entityType).toBe('purchase');
    expect(entry.tenantId).toBe(TENANT_A_ID);
    expect(entry.userId).toBe(TEST_USER_ID);
    expect(entry.oldData).toBeNull();
    expect(entry.newData).not.toBeNull();
  });

  it('updatePurchaseStatus writes action=status_change with old+new status', async () => {
    const purchase = await createPurchase(
      TENANT_A_ID,
      {
        items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '5', unitPrice: '5.00' }],
      },
      TEST_USER_ID,
    );

    await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'ordered', TEST_USER_ID);

    const entries = await getAuditEntries(purchase.id);
    const statusEntry = entries.find((e) => e.action === 'status_change');
    expect(statusEntry).toBeDefined();
    expect((statusEntry?.oldData as Record<string, unknown>)?.status).toBe('draft');
    expect((statusEntry?.newData as Record<string, unknown>)?.status).toBe('ordered');
  });

  it('all audit entries have correct tenantId', async () => {
    const item = await createItem(
      TENANT_A_ID,
      { name: 'TenantId Check Item', type: 'goods' },
      TEST_USER_ID,
    );

    const entries = await getAuditEntries(item.id);
    entries.forEach((entry) => expect(entry.tenantId).toBe(TENANT_A_ID));
  });

  it('all audit entries have non-null userId', async () => {
    const item = await createItem(
      TENANT_A_ID,
      { name: 'UserId Check Item', type: 'goods' },
      TEST_USER_ID,
    );

    const entries = await getAuditEntries(item.id);
    entries.forEach((entry) => expect(entry.userId).not.toBeNull());
  });

  it('create audit entries have null oldData', async () => {
    const item = await createItem(
      TENANT_A_ID,
      { name: 'Create OldData Check', type: 'goods' },
      TEST_USER_ID,
    );

    const entries = await getAuditEntries(item.id);
    const createEntry = entries.find((e) => e.action === 'create');
    expect(createEntry?.oldData).toBeNull();
  });

  it('update audit entries have both oldData and newData', async () => {
    const item = await createItem(
      TENANT_A_ID,
      { name: 'Both Data Check Item', type: 'goods' },
      TEST_USER_ID,
    );
    await updateItem(TENANT_A_ID, item.id, { name: 'Both Data Check Updated' }, TEST_USER_ID);

    const entries = await getAuditEntries(item.id);
    const updateEntry = entries.find((e) => e.action === 'update');
    expect(updateEntry?.oldData).not.toBeNull();
    expect(updateEntry?.newData).not.toBeNull();
  });

  it('delete audit entries have oldData and null newData', async () => {
    const item = await createItem(
      TENANT_A_ID,
      { name: 'Delete Both Data Check', type: 'goods' },
      TEST_USER_ID,
    );
    await softDeleteItem(TENANT_A_ID, item.id, TEST_USER_ID);

    const entries = await getAuditEntries(item.id);
    const deleteEntry = entries.find((e) => e.action === 'delete');
    expect(deleteEntry?.oldData).not.toBeNull();
    expect(deleteEntry?.newData).toBeNull();
  });
});
