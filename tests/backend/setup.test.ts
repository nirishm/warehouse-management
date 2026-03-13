import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, schema } from '../helpers/db';
import { eq, and, inArray } from 'drizzle-orm';
import * as factory from '../helpers/factories';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  TENANT_A_ID,
  TENANT_B_ID,
  TENANT_A_SLUG,
  TENANT_B_SLUG,
  USERS,
  LOCATIONS,
  UNITS,
  ITEMS,
  CONTACTS,
  PURCHASES,
  SALES,
  TRANSFERS,
  ADJUSTMENTS,
  PAYMENTS,
  ALERT_THRESHOLDS,
  CUSTOM_FIELDS,
  USER_LOCATIONS,
} from '../helpers/test-data';

beforeAll(async () => {
  await cleanupAllTestData();
});

afterAll(async () => {
  await cleanupAllTestData();
});

// ── Tenants ───────────────────────────────────────────────────────────────────

describe('Tenants', () => {
  it('creates tenant A with all modules', async () => {
    const tenant = await factory.createTestTenant({
      id: TENANT_A_ID,
      name: 'Test Warehouse Co',
      slug: TENANT_A_SLUG,
      enabledModules: ['inventory', 'purchases', 'sales', 'transfers', 'adjustments'],
      plan: 'pro',
    });
    expect(tenant.id).toBe(TENANT_A_ID);
    expect(tenant.slug).toBe(TENANT_A_SLUG);
    expect(tenant.status).toBe('active');
    expect(tenant.enabledModules).toEqual([
      'inventory',
      'purchases',
      'sales',
      'transfers',
      'adjustments',
    ]);
  });

  it('creates tenant B for isolation testing', async () => {
    const tenant = await factory.createTestTenant({
      id: TENANT_B_ID,
      name: 'Other Org',
      slug: TENANT_B_SLUG,
      enabledModules: ['inventory'],
      plan: 'free',
    });
    expect(tenant.id).toBe(TENANT_B_ID);
    expect(tenant.slug).toBe(TENANT_B_SLUG);
  });
});

// ── Users ─────────────────────────────────────────────────────────────────────

describe('Users (10 accounts)', () => {
  it('creates owner + 2 admins', async () => {
    // Auth users (required before user_tenants FK)
    await factory.createAuthUser({ id: USERS.owner.id, email: USERS.owner.email });
    await factory.createAuthUser({ id: USERS.admin1.id, email: USERS.admin1.email });
    await factory.createAuthUser({ id: USERS.admin2.id, email: USERS.admin2.email });
    // Memberships
    await factory.createUserMembership({
      userId: USERS.owner.id,
      tenantId: TENANT_A_ID,
      role: 'owner',
      isDefault: true,
    });
    await factory.createUserMembership({
      userId: USERS.admin1.id,
      tenantId: TENANT_A_ID,
      role: 'admin',
      isDefault: true,
    });
    await factory.createUserMembership({
      userId: USERS.admin2.id,
      tenantId: TENANT_A_ID,
      role: 'admin',
      isDefault: true,
    });
    // Profiles
    await factory.createUserProfile({
      id: USERS.owner.profileId,
      userId: USERS.owner.id,
      tenantId: TENANT_A_ID,
      displayName: 'Owner User',
    });
    await factory.createUserProfile({
      id: USERS.admin1.profileId,
      userId: USERS.admin1.id,
      tenantId: TENANT_A_ID,
      displayName: 'Admin One',
    });
    await factory.createUserProfile({
      id: USERS.admin2.profileId,
      userId: USERS.admin2.id,
      tenantId: TENANT_A_ID,
      displayName: 'Admin Two',
    });

    const memberships = await db
      .select()
      .from(schema.userTenants)
      .where(
        and(
          eq(schema.userTenants.tenantId, TENANT_A_ID),
          inArray(schema.userTenants.userId, [
            USERS.owner.id,
            USERS.admin1.id,
            USERS.admin2.id,
          ]),
        ),
      );
    expect(memberships).toHaveLength(3);
  });

  it('creates 2 managers with location assignments', async () => {
    await factory.createAuthUser({ id: USERS.manager1.id, email: USERS.manager1.email });
    await factory.createAuthUser({ id: USERS.manager2.id, email: USERS.manager2.email });
    await factory.createUserMembership({
      userId: USERS.manager1.id,
      tenantId: TENANT_A_ID,
      role: 'manager',
      isDefault: true,
    });
    await factory.createUserMembership({
      userId: USERS.manager2.id,
      tenantId: TENANT_A_ID,
      role: 'manager',
      isDefault: true,
    });
    await factory.createUserProfile({
      id: USERS.manager1.profileId,
      userId: USERS.manager1.id,
      tenantId: TENANT_A_ID,
      displayName: 'Manager Alpha',
    });
    await factory.createUserProfile({
      id: USERS.manager2.profileId,
      userId: USERS.manager2.id,
      tenantId: TENANT_A_ID,
      displayName: 'Manager Beta',
    });
    // Location assignments happen after locations are created — deferred to that test
  });

  it('creates 2 operators', async () => {
    await factory.createAuthUser({ id: USERS.operator1.id, email: USERS.operator1.email });
    await factory.createAuthUser({ id: USERS.operator2.id, email: USERS.operator2.email });
    await factory.createUserMembership({
      userId: USERS.operator1.id,
      tenantId: TENANT_A_ID,
      role: 'operator',
      isDefault: true,
    });
    await factory.createUserMembership({
      userId: USERS.operator2.id,
      tenantId: TENANT_A_ID,
      role: 'operator',
      isDefault: true,
    });
    await factory.createUserProfile({
      id: USERS.operator1.profileId,
      userId: USERS.operator1.id,
      tenantId: TENANT_A_ID,
      displayName: 'Operator One',
    });
    await factory.createUserProfile({
      id: USERS.operator2.profileId,
      userId: USERS.operator2.id,
      tenantId: TENANT_A_ID,
      displayName: 'Operator Two',
    });
  });

  it('creates 2 viewers', async () => {
    await factory.createAuthUser({ id: USERS.viewer1.id, email: USERS.viewer1.email });
    await factory.createAuthUser({ id: USERS.viewer2.id, email: USERS.viewer2.email });
    await factory.createUserMembership({
      userId: USERS.viewer1.id,
      tenantId: TENANT_A_ID,
      role: 'viewer',
      isDefault: true,
    });
    await factory.createUserMembership({
      userId: USERS.viewer2.id,
      tenantId: TENANT_A_ID,
      role: 'viewer',
      isDefault: true,
    });
    await factory.createUserProfile({
      id: USERS.viewer1.profileId,
      userId: USERS.viewer1.id,
      tenantId: TENANT_A_ID,
      displayName: 'Viewer One',
    });
    await factory.createUserProfile({
      id: USERS.viewer2.profileId,
      userId: USERS.viewer2.id,
      tenantId: TENANT_A_ID,
      displayName: 'Viewer Two',
    });
  });

  it('creates cross-tenant user (viewer in A, admin in B)', async () => {
    await factory.createAuthUser({ id: USERS.crossTenant.id, email: USERS.crossTenant.email });
    await factory.createUserMembership({
      userId: USERS.crossTenant.id,
      tenantId: TENANT_A_ID,
      role: 'viewer',
      isDefault: false,
    });
    await factory.createUserMembership({
      userId: USERS.crossTenant.id,
      tenantId: TENANT_B_ID,
      role: 'admin',
      isDefault: true,
    });
    await factory.createUserProfile({
      id: USERS.crossTenant.profileId,
      userId: USERS.crossTenant.id,
      tenantId: TENANT_A_ID,
      displayName: 'Cross Tenant User',
    });

    const memberships = await db
      .select()
      .from(schema.userTenants)
      .where(eq(schema.userTenants.userId, USERS.crossTenant.id));
    expect(memberships).toHaveLength(2);

    const inB = memberships.find((m) => m.tenantId === TENANT_B_ID);
    expect(inB?.role).toBe('admin');
    const inA = memberships.find((m) => m.tenantId === TENANT_A_ID);
    expect(inA?.role).toBe('viewer');
  });
});

// ── Inventory Entities ────────────────────────────────────────────────────────

describe('Inventory Entities', () => {
  it('creates 3 units', async () => {
    await factory.createTestUnit({
      id: UNITS.piece.id,
      tenantId: TENANT_A_ID,
      name: UNITS.piece.name,
      abbreviation: UNITS.piece.abbreviation,
      type: UNITS.piece.type,
    });
    await factory.createTestUnit({
      id: UNITS.kilogram.id,
      tenantId: TENANT_A_ID,
      name: UNITS.kilogram.name,
      abbreviation: UNITS.kilogram.abbreviation,
      type: UNITS.kilogram.type,
    });
    await factory.createTestUnit({
      id: UNITS.box.id,
      tenantId: TENANT_A_ID,
      name: UNITS.box.name,
      abbreviation: UNITS.box.abbreviation,
      type: UNITS.box.type,
    });

    const rows = await db
      .select()
      .from(schema.units)
      .where(eq(schema.units.tenantId, TENANT_A_ID));
    expect(rows).toHaveLength(3);
  });

  it('creates 3 locations', async () => {
    await factory.createTestLocation({
      id: LOCATIONS.alpha.id,
      tenantId: TENANT_A_ID,
      name: LOCATIONS.alpha.name,
      code: LOCATIONS.alpha.code,
      type: LOCATIONS.alpha.type,
    });
    await factory.createTestLocation({
      id: LOCATIONS.beta.id,
      tenantId: TENANT_A_ID,
      name: LOCATIONS.beta.name,
      code: LOCATIONS.beta.code,
      type: LOCATIONS.beta.type,
    });
    await factory.createTestLocation({
      id: LOCATIONS.store.id,
      tenantId: TENANT_A_ID,
      name: LOCATIONS.store.name,
      code: LOCATIONS.store.code,
      type: LOCATIONS.store.type,
    });

    // Now create location assignments for managers/operators/viewers
    await factory.createUserLocation({
      id: USER_LOCATIONS.manager1Alpha.id,
      userId: USERS.manager1.id,
      tenantId: TENANT_A_ID,
      locationId: LOCATIONS.alpha.id,
    });
    await factory.createUserLocation({
      id: USER_LOCATIONS.manager2Beta.id,
      userId: USERS.manager2.id,
      tenantId: TENANT_A_ID,
      locationId: LOCATIONS.beta.id,
    });
    await factory.createUserLocation({
      id: USER_LOCATIONS.operator1Alpha.id,
      userId: USERS.operator1.id,
      tenantId: TENANT_A_ID,
      locationId: LOCATIONS.alpha.id,
    });
    await factory.createUserLocation({
      id: USER_LOCATIONS.operator2Beta.id,
      userId: USERS.operator2.id,
      tenantId: TENANT_A_ID,
      locationId: LOCATIONS.beta.id,
    });
    await factory.createUserLocation({
      id: USER_LOCATIONS.viewer2Alpha.id,
      userId: USERS.viewer2.id,
      tenantId: TENANT_A_ID,
      locationId: LOCATIONS.alpha.id,
    });

    const locRows = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.tenantId, TENANT_A_ID));
    expect(locRows).toHaveLength(3);

    const ulRows = await db
      .select()
      .from(schema.userLocations)
      .where(eq(schema.userLocations.tenantId, TENANT_A_ID));
    expect(ulRows).toHaveLength(5);
  });

  it('creates 5 items', async () => {
    for (const [, item] of Object.entries(ITEMS)) {
      await factory.createTestItem({
        id: item.id,
        tenantId: TENANT_A_ID,
        name: item.name,
        code: item.code,
        defaultUnitId: UNITS.piece.id,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
      });
    }

    const rows = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.tenantId, TENANT_A_ID));
    expect(rows).toHaveLength(5);
  });

  it('creates 4 contacts', async () => {
    for (const [, contact] of Object.entries(CONTACTS)) {
      await factory.createTestContact({
        id: contact.id,
        tenantId: TENANT_A_ID,
        name: contact.name,
        type: contact.type,
      });
    }

    const rows = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.tenantId, TENANT_A_ID));
    expect(rows).toHaveLength(4);
  });
});

// ── Transactions ──────────────────────────────────────────────────────────────

describe('Transactions', () => {
  it('creates PUR-1 (draft): Widget x100 + Gadget x50 at Alpha from SupplierA', async () => {
    const pur = await factory.createTestPurchase({
      id: PURCHASES.pur1.id,
      tenantId: TENANT_A_ID,
      purchaseNumber: 'PUR-000001',
      contactId: CONTACTS.supplierA.id,
      locationId: LOCATIONS.alpha.id,
      status: 'draft',
      items: [
        { itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '100', unitPrice: '100.00' },
        { itemId: ITEMS.gadget.id, unitId: UNITS.piece.id, quantity: '50', unitPrice: '200.00' },
      ],
    });
    expect(pur.id).toBe(PURCHASES.pur1.id);
    expect(pur.status).toBe('draft');
    expect(pur.items).toHaveLength(2);
  });

  it('creates PUR-2 (ordered): Bolt x500 + Nut x1000 at Alpha from SupplierB', async () => {
    const pur = await factory.createTestPurchase({
      id: PURCHASES.pur2.id,
      tenantId: TENANT_A_ID,
      purchaseNumber: 'PUR-000002',
      contactId: CONTACTS.supplierB.id,
      locationId: LOCATIONS.alpha.id,
      status: 'ordered',
      items: [
        { itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '500', unitPrice: '5.00' },
        { itemId: ITEMS.nut.id, unitId: UNITS.piece.id, quantity: '1000', unitPrice: '3.00' },
      ],
    });
    expect(pur.status).toBe('ordered');
    expect(pur.items).toHaveLength(2);
  });

  it('creates PUR-3 (received): Widget x200 + Spring x300 at Beta from SupplierA', async () => {
    const pur = await factory.createTestPurchase({
      id: PURCHASES.pur3.id,
      tenantId: TENANT_A_ID,
      purchaseNumber: 'PUR-000003',
      contactId: CONTACTS.supplierA.id,
      locationId: LOCATIONS.beta.id,
      status: 'received',
      items: [
        { itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '200', unitPrice: '100.00' },
        { itemId: ITEMS.spring.id, unitId: UNITS.piece.id, quantity: '300', unitPrice: '15.00' },
      ],
    });
    expect(pur.status).toBe('received');
    expect(pur.items).toHaveLength(2);
  });

  it('creates SAL-1 (draft): Widget x10 at Alpha to CustomerA', async () => {
    const sal = await factory.createTestSale({
      id: SALES.sal1.id,
      tenantId: TENANT_A_ID,
      saleNumber: 'SAL-000001',
      contactId: CONTACTS.customerA.id,
      locationId: LOCATIONS.alpha.id,
      status: 'draft',
      items: [
        { itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '10', unitPrice: '150.00' },
      ],
    });
    expect(sal.status).toBe('draft');
    expect(sal.items).toHaveLength(1);
  });

  it('creates SAL-2 (confirmed): Gadget x20 at Beta to CustomerB', async () => {
    const sal = await factory.createTestSale({
      id: SALES.sal2.id,
      tenantId: TENANT_A_ID,
      saleNumber: 'SAL-000002',
      contactId: CONTACTS.customerB.id,
      locationId: LOCATIONS.beta.id,
      status: 'confirmed',
      items: [
        { itemId: ITEMS.gadget.id, unitId: UNITS.piece.id, quantity: '20', unitPrice: '300.00' },
      ],
    });
    expect(sal.status).toBe('confirmed');
  });

  it('creates SAL-3 (dispatched): Bolt x100 at Alpha to CustomerA', async () => {
    const sal = await factory.createTestSale({
      id: SALES.sal3.id,
      tenantId: TENANT_A_ID,
      saleNumber: 'SAL-000003',
      contactId: CONTACTS.customerA.id,
      locationId: LOCATIONS.alpha.id,
      status: 'dispatched',
      items: [
        { itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '100', unitPrice: '8.00' },
      ],
    });
    expect(sal.status).toBe('dispatched');
  });

  it('creates TFR-1 (dispatched): Widget x50 Alpha→Beta', async () => {
    const tfr = await factory.createTestTransfer({
      id: TRANSFERS.tfr1.id,
      tenantId: TENANT_A_ID,
      transferNumber: 'TFR-000001',
      originLocationId: LOCATIONS.alpha.id,
      destLocationId: LOCATIONS.beta.id,
      status: 'dispatched',
      items: [
        { itemId: ITEMS.widget.id, unitId: UNITS.piece.id, sentQty: '50' },
      ],
    });
    expect(tfr.status).toBe('dispatched');
    expect(tfr.items).toHaveLength(1);
  });

  it('creates TFR-2 (received): Spring x100 Beta→Alpha, receivedQty=95, shortage=5', async () => {
    const tfr = await factory.createTestTransfer({
      id: TRANSFERS.tfr2.id,
      tenantId: TENANT_A_ID,
      transferNumber: 'TFR-000002',
      originLocationId: LOCATIONS.beta.id,
      destLocationId: LOCATIONS.alpha.id,
      status: 'received',
      items: [
        {
          itemId: ITEMS.spring.id,
          unitId: UNITS.piece.id,
          sentQty: '100',
          receivedQty: '95',
          shortage: '5',
        },
      ],
    });
    expect(tfr.status).toBe('received');
    expect(tfr.items[0].shortage).toBe('5');
  });

  it('creates ADJ-1 (draft): Widget +25 at Alpha', async () => {
    const adj = await factory.createTestAdjustment({
      id: ADJUSTMENTS.adj1.id,
      tenantId: TENANT_A_ID,
      adjustmentNumber: 'ADJ-000001',
      locationId: LOCATIONS.alpha.id,
      reason: 'Cycle count correction',
      type: 'qty',
      status: 'draft',
      items: [
        { itemId: ITEMS.widget.id, unitId: UNITS.piece.id, qtyChange: '25' },
      ],
    });
    expect(adj.status).toBe('draft');
    expect(adj.items).toHaveLength(1);
  });

  it('creates ADJ-2 (approved): Nut -10 at Alpha', async () => {
    const adj = await factory.createTestAdjustment({
      id: ADJUSTMENTS.adj2.id,
      tenantId: TENANT_A_ID,
      adjustmentNumber: 'ADJ-000002',
      locationId: LOCATIONS.alpha.id,
      reason: 'Damaged stock write-off',
      type: 'qty',
      status: 'approved',
      items: [
        { itemId: ITEMS.nut.id, unitId: UNITS.piece.id, qtyChange: '-10' },
      ],
    });
    expect(adj.status).toBe('approved');
    expect(adj.items[0].qtyChange).toBe('-10');
  });

  it('creates 3 payments', async () => {
    await factory.createTestPayment({
      id: PAYMENTS.pay1.id,
      tenantId: TENANT_A_ID,
      type: 'purchase',
      referenceId: PURCHASES.pur3.id,
      amount: '34500.00',
      paymentMethod: 'bank_transfer',
    });
    await factory.createTestPayment({
      id: PAYMENTS.pay2.id,
      tenantId: TENANT_A_ID,
      type: 'sale',
      referenceId: SALES.sal3.id,
      amount: '800.00',
      paymentMethod: 'cash',
    });
    await factory.createTestPayment({
      id: PAYMENTS.pay3.id,
      tenantId: TENANT_A_ID,
      type: 'sale',
      referenceId: SALES.sal2.id,
      amount: '6000.00',
      paymentMethod: 'credit',
    });

    const rows = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.tenantId, TENANT_A_ID));
    expect(rows).toHaveLength(3);
  });

  it('creates 2 alert thresholds', async () => {
    await factory.createTestAlertThreshold({
      id: ALERT_THRESHOLDS.widgetAlpha.id,
      tenantId: TENANT_A_ID,
      itemId: ITEMS.widget.id,
      locationId: LOCATIONS.alpha.id,
      minQuantity: '50',
    });
    await factory.createTestAlertThreshold({
      id: ALERT_THRESHOLDS.boltBeta.id,
      tenantId: TENANT_A_ID,
      itemId: ITEMS.bolt.id,
      locationId: LOCATIONS.beta.id,
      minQuantity: '100',
    });

    const rows = await db
      .select()
      .from(schema.alertThresholds)
      .where(eq(schema.alertThresholds.tenantId, TENANT_A_ID));
    expect(rows).toHaveLength(2);
  });

  it('creates 2 custom field definitions', async () => {
    await factory.createTestCustomField({
      id: CUSTOM_FIELDS.itemBatch.id,
      tenantId: TENANT_A_ID,
      entityType: 'item',
      fieldName: 'batch_number',
      fieldType: 'text',
      isRequired: false,
      sortOrder: 1,
    });
    await factory.createTestCustomField({
      id: CUSTOM_FIELDS.purchasePO.id,
      tenantId: TENANT_A_ID,
      entityType: 'purchase',
      fieldName: 'po_reference',
      fieldType: 'text',
      isRequired: false,
      sortOrder: 1,
    });

    const rows = await db
      .select()
      .from(schema.customFieldDefinitions)
      .where(eq(schema.customFieldDefinitions.tenantId, TENANT_A_ID));
    expect(rows).toHaveLength(2);
  });
});

// ── Verification ──────────────────────────────────────────────────────────────

describe('Verification: entity counts', () => {
  it('all master data counts are correct', async () => {
    const [itemCount] = await db
      .select({ count: db.$count(schema.items, eq(schema.items.tenantId, TENANT_A_ID)) })
      .from(schema.items)
      .where(eq(schema.items.tenantId, TENANT_A_ID))
      .limit(1);

    const itemRows = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.tenantId, TENANT_A_ID));
    const locationRows = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.tenantId, TENANT_A_ID));
    const unitRows = await db
      .select()
      .from(schema.units)
      .where(eq(schema.units.tenantId, TENANT_A_ID));
    const contactRows = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.tenantId, TENANT_A_ID));

    expect(itemRows).toHaveLength(5);
    expect(locationRows).toHaveLength(3);
    expect(unitRows).toHaveLength(3);
    expect(contactRows).toHaveLength(4);
  });

  it('all transaction counts are correct', async () => {
    const purchaseRows = await db
      .select()
      .from(schema.purchases)
      .where(eq(schema.purchases.tenantId, TENANT_A_ID));
    const saleRows = await db
      .select()
      .from(schema.sales)
      .where(eq(schema.sales.tenantId, TENANT_A_ID));
    const transferRows = await db
      .select()
      .from(schema.transfers)
      .where(eq(schema.transfers.tenantId, TENANT_A_ID));
    const adjustmentRows = await db
      .select()
      .from(schema.adjustments)
      .where(eq(schema.adjustments.tenantId, TENANT_A_ID));

    expect(purchaseRows).toHaveLength(3);
    expect(saleRows).toHaveLength(3);
    expect(transferRows).toHaveLength(2);
    expect(adjustmentRows).toHaveLength(2);
  });

  it('user profile and location assignment counts are correct', async () => {
    const profileRows = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.tenantId, TENANT_A_ID));
    const locationRows = await db
      .select()
      .from(schema.userLocations)
      .where(eq(schema.userLocations.tenantId, TENANT_A_ID));

    expect(profileRows).toHaveLength(10);
    expect(locationRows).toHaveLength(5);
  });

  it('tenants table has both test tenants', async () => {
    const rows = await db
      .select()
      .from(schema.tenants)
      .where(inArray(schema.tenants.id, [TENANT_A_ID, TENANT_B_ID]));
    expect(rows).toHaveLength(2);
  });
});
