import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, withTenantScope, queryStockLevels, schema } from '../helpers/db';
import { eq } from 'drizzle-orm';
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

  // Tenants
  await factory.createTestTenant({
    id: TENANT_A_ID,
    name: 'Test Warehouse Co',
    slug: TENANT_A_SLUG,
    enabledModules: ['inventory', 'purchases', 'sales', 'transfers', 'adjustments'],
    plan: 'pro',
  });
  await factory.createTestTenant({
    id: TENANT_B_ID,
    name: 'Other Org',
    slug: TENANT_B_SLUG,
    enabledModules: ['inventory'],
    plan: 'free',
  });

  // Tenant A — units, locations, items, contacts
  await factory.createTestUnit({ id: UNITS.piece.id, tenantId: TENANT_A_ID, name: UNITS.piece.name, abbreviation: UNITS.piece.abbreviation, type: UNITS.piece.type });
  await factory.createTestUnit({ id: UNITS.kilogram.id, tenantId: TENANT_A_ID, name: UNITS.kilogram.name, abbreviation: UNITS.kilogram.abbreviation, type: UNITS.kilogram.type });
  await factory.createTestUnit({ id: UNITS.box.id, tenantId: TENANT_A_ID, name: UNITS.box.name, abbreviation: UNITS.box.abbreviation, type: UNITS.box.type });

  await factory.createTestLocation({ id: LOCATIONS.alpha.id, tenantId: TENANT_A_ID, name: LOCATIONS.alpha.name, code: LOCATIONS.alpha.code, type: LOCATIONS.alpha.type });
  await factory.createTestLocation({ id: LOCATIONS.beta.id, tenantId: TENANT_A_ID, name: LOCATIONS.beta.name, code: LOCATIONS.beta.code, type: LOCATIONS.beta.type });
  await factory.createTestLocation({ id: LOCATIONS.store.id, tenantId: TENANT_A_ID, name: LOCATIONS.store.name, code: LOCATIONS.store.code, type: LOCATIONS.store.type });

  for (const [, item] of Object.entries(ITEMS)) {
    await factory.createTestItem({ id: item.id, tenantId: TENANT_A_ID, name: item.name, code: item.code, defaultUnitId: UNITS.piece.id, purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice });
  }
  for (const [, contact] of Object.entries(CONTACTS)) {
    await factory.createTestContact({ id: contact.id, tenantId: TENANT_A_ID, name: contact.name, type: contact.type });
  }

  // Auth users (required before user_tenants FK)
  for (const [, user] of Object.entries(USERS)) {
    await factory.createAuthUser({ id: user.id, email: user.email });
  }

  // Tenant A user profiles
  for (const [, user] of Object.entries(USERS)) {
    await factory.createUserMembership({ userId: user.id, tenantId: TENANT_A_ID, role: user.role, isDefault: true });
    await factory.createUserProfile({ id: user.profileId, userId: user.id, tenantId: TENANT_A_ID });
  }
  // cross-tenant user also in B
  await factory.createUserMembership({ userId: USERS.crossTenant.id, tenantId: TENANT_B_ID, role: 'admin', isDefault: false });

  // Location assignments
  await factory.createUserLocation({ id: USER_LOCATIONS.manager1Alpha.id, userId: USERS.manager1.id, tenantId: TENANT_A_ID, locationId: LOCATIONS.alpha.id });
  await factory.createUserLocation({ id: USER_LOCATIONS.manager2Beta.id, userId: USERS.manager2.id, tenantId: TENANT_A_ID, locationId: LOCATIONS.beta.id });
  await factory.createUserLocation({ id: USER_LOCATIONS.operator1Alpha.id, userId: USERS.operator1.id, tenantId: TENANT_A_ID, locationId: LOCATIONS.alpha.id });
  await factory.createUserLocation({ id: USER_LOCATIONS.operator2Beta.id, userId: USERS.operator2.id, tenantId: TENANT_A_ID, locationId: LOCATIONS.beta.id });
  await factory.createUserLocation({ id: USER_LOCATIONS.viewer2Alpha.id, userId: USERS.viewer2.id, tenantId: TENANT_A_ID, locationId: LOCATIONS.alpha.id });

  // Transactions in Tenant A
  await factory.createTestPurchase({ id: PURCHASES.pur1.id, tenantId: TENANT_A_ID, purchaseNumber: 'PUR-000001', contactId: CONTACTS.supplierA.id, locationId: LOCATIONS.alpha.id, status: 'draft', items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '100', unitPrice: '100.00' }] });
  await factory.createTestPurchase({ id: PURCHASES.pur2.id, tenantId: TENANT_A_ID, purchaseNumber: 'PUR-000002', locationId: LOCATIONS.alpha.id, status: 'ordered', items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '500', unitPrice: '5.00' }] });
  await factory.createTestPurchase({ id: PURCHASES.pur3.id, tenantId: TENANT_A_ID, purchaseNumber: 'PUR-000003', contactId: CONTACTS.supplierA.id, locationId: LOCATIONS.beta.id, status: 'received', items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '200', unitPrice: '100.00' }, { itemId: ITEMS.spring.id, unitId: UNITS.piece.id, quantity: '300', unitPrice: '15.00' }] });

  await factory.createTestSale({ id: SALES.sal1.id, tenantId: TENANT_A_ID, saleNumber: 'SAL-000001', locationId: LOCATIONS.alpha.id, status: 'draft', items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '10', unitPrice: '150.00' }] });
  await factory.createTestSale({ id: SALES.sal2.id, tenantId: TENANT_A_ID, saleNumber: 'SAL-000002', locationId: LOCATIONS.beta.id, status: 'confirmed', items: [{ itemId: ITEMS.gadget.id, unitId: UNITS.piece.id, quantity: '20', unitPrice: '300.00' }] });
  await factory.createTestSale({ id: SALES.sal3.id, tenantId: TENANT_A_ID, saleNumber: 'SAL-000003', locationId: LOCATIONS.alpha.id, status: 'dispatched', items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '100', unitPrice: '8.00' }] });

  await factory.createTestTransfer({ id: TRANSFERS.tfr1.id, tenantId: TENANT_A_ID, transferNumber: 'TFR-000001', originLocationId: LOCATIONS.alpha.id, destLocationId: LOCATIONS.beta.id, status: 'dispatched', items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, sentQty: '50' }] });
  await factory.createTestTransfer({ id: TRANSFERS.tfr2.id, tenantId: TENANT_A_ID, transferNumber: 'TFR-000002', originLocationId: LOCATIONS.beta.id, destLocationId: LOCATIONS.alpha.id, status: 'received', items: [{ itemId: ITEMS.spring.id, unitId: UNITS.piece.id, sentQty: '100', receivedQty: '95', shortage: '5' }] });

  await factory.createTestAdjustment({ id: ADJUSTMENTS.adj1.id, tenantId: TENANT_A_ID, adjustmentNumber: 'ADJ-000001', locationId: LOCATIONS.alpha.id, type: 'qty', status: 'draft', items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, qtyChange: '25' }] });
  await factory.createTestAdjustment({ id: ADJUSTMENTS.adj2.id, tenantId: TENANT_A_ID, adjustmentNumber: 'ADJ-000002', locationId: LOCATIONS.alpha.id, type: 'qty', status: 'approved', items: [{ itemId: ITEMS.nut.id, unitId: UNITS.piece.id, qtyChange: '-10' }] });

  await factory.createTestPayment({ id: PAYMENTS.pay1.id, tenantId: TENANT_A_ID, type: 'purchase', referenceId: PURCHASES.pur3.id, amount: '34500.00' });
  await factory.createTestPayment({ id: PAYMENTS.pay2.id, tenantId: TENANT_A_ID, type: 'sale', referenceId: SALES.sal3.id, amount: '800.00' });
  await factory.createTestPayment({ id: PAYMENTS.pay3.id, tenantId: TENANT_A_ID, type: 'sale', referenceId: SALES.sal2.id, amount: '6000.00' });

  await factory.createTestAlertThreshold({ id: ALERT_THRESHOLDS.widgetAlpha.id, tenantId: TENANT_A_ID, itemId: ITEMS.widget.id, locationId: LOCATIONS.alpha.id, minQuantity: '50' });
  await factory.createTestAlertThreshold({ id: ALERT_THRESHOLDS.boltBeta.id, tenantId: TENANT_A_ID, itemId: ITEMS.bolt.id, locationId: LOCATIONS.beta.id, minQuantity: '100' });

  await factory.createTestCustomField({ id: CUSTOM_FIELDS.itemBatch.id, tenantId: TENANT_A_ID, entityType: 'item', fieldName: 'batch_number', fieldType: 'text' });
  await factory.createTestCustomField({ id: CUSTOM_FIELDS.purchasePO.id, tenantId: TENANT_A_ID, entityType: 'purchase', fieldName: 'po_reference', fieldType: 'text' });
});

afterAll(async () => {
  await cleanupAllTestData();
});

// ── withTenantScope isolation ─────────────────────────────────────────────────

describe('Tenant Isolation', () => {
  describe('withTenantScope queries return zero rows for wrong tenant', () => {
    it('tenant B sees 0 items', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.items);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 locations', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.locations);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 units', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.units);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 contacts', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.contacts);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 purchases', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.purchases);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 sales', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.sales);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 transfers', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.transfers);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 adjustments', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.adjustments);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 payments', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.payments);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 alert thresholds', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.alertThresholds);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 custom field definitions', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.customFieldDefinitions);
      expect(rows).toHaveLength(0);
    });

    it('tenant B sees 0 user profiles', async () => {
      const scope = withTenantScope(db, TENANT_B_ID);
      const rows = await scope.query(schema.userProfiles);
      expect(rows).toHaveLength(0);
    });
  });

  describe('stock_levels VIEW isolation', () => {
    it('queryStockLevels for tenant B returns empty', async () => {
      const levels = await queryStockLevels(db, TENANT_B_ID);
      expect(levels).toHaveLength(0);
    });
  });

  describe('Cross-tenant user queries', () => {
    it('scope with tenant A ID returns items for tenant A', async () => {
      const scopeA = withTenantScope(db, TENANT_A_ID);
      const rows = await scopeA.query(schema.items);
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row) => expect(row.tenantId).toBe(TENANT_A_ID));
    });

    it('scope with tenant B ID returns 0 items despite same user existing in both', async () => {
      // crossTenant user is a member of both A and B, but B has no items
      const scopeB = withTenantScope(db, TENANT_B_ID);
      const rows = await scopeB.query(schema.items);
      expect(rows).toHaveLength(0);
    });
  });
});
