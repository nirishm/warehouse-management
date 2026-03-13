import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, queryStockLevels } from '../helpers/db';
import * as factory from '../helpers/factories';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  TENANT_A_ID,
  TENANT_A_SLUG,
  UNITS,
  LOCATIONS,
  ITEMS,
  CONTACTS,
  PURCHASES,
  SALES,
  TRANSFERS,
  ADJUSTMENTS,
} from '../helpers/test-data';

beforeAll(async () => {
  await cleanupAllTestData();

  // Minimal tenant setup
  await factory.createTestTenant({
    id: TENANT_A_ID,
    name: 'Stock Test Co',
    slug: TENANT_A_SLUG,
    enabledModules: ['inventory', 'purchases', 'sales', 'transfers', 'adjustments'],
    plan: 'starter',
  });

  // Master data
  await factory.createTestUnit({ id: UNITS.piece.id, tenantId: TENANT_A_ID, name: UNITS.piece.name, abbreviation: UNITS.piece.abbreviation, type: UNITS.piece.type });
  await factory.createTestLocation({ id: LOCATIONS.alpha.id, tenantId: TENANT_A_ID, name: LOCATIONS.alpha.name, code: LOCATIONS.alpha.code, type: LOCATIONS.alpha.type });
  await factory.createTestLocation({ id: LOCATIONS.beta.id, tenantId: TENANT_A_ID, name: LOCATIONS.beta.name, code: LOCATIONS.beta.code, type: LOCATIONS.beta.type });
  await factory.createTestContact({ id: CONTACTS.supplierA.id, tenantId: TENANT_A_ID, name: CONTACTS.supplierA.name, type: CONTACTS.supplierA.type });
  await factory.createTestContact({ id: CONTACTS.customerA.id, tenantId: TENANT_A_ID, name: CONTACTS.customerA.name, type: CONTACTS.customerA.type });
  await factory.createTestContact({ id: CONTACTS.customerB.id, tenantId: TENANT_A_ID, name: CONTACTS.customerB.name, type: CONTACTS.customerB.type });

  for (const [, item] of Object.entries(ITEMS)) {
    await factory.createTestItem({ id: item.id, tenantId: TENANT_A_ID, name: item.name, code: item.code, defaultUnitId: UNITS.piece.id, purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice });
  }

  // PUR-1 (draft) — Widget x100 at Alpha — should NOT affect stock
  await factory.createTestPurchase({
    id: PURCHASES.pur1.id,
    tenantId: TENANT_A_ID,
    purchaseNumber: 'PUR-000001',
    locationId: LOCATIONS.alpha.id,
    status: 'draft',
    items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '100', unitPrice: '100.00' }],
  });

  // PUR-2 (ordered) — Bolt x500 at Alpha — should NOT affect stock
  await factory.createTestPurchase({
    id: PURCHASES.pur2.id,
    tenantId: TENANT_A_ID,
    purchaseNumber: 'PUR-000002',
    locationId: LOCATIONS.alpha.id,
    status: 'ordered',
    items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '500', unitPrice: '5.00' }],
  });

  // PUR-3 (received) — Widget x200 + Spring x300 at Beta — AFFECTS stock
  await factory.createTestPurchase({
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

  // SAL-1 (draft) — Widget x10 at Alpha — should NOT affect stock
  await factory.createTestSale({
    id: SALES.sal1.id,
    tenantId: TENANT_A_ID,
    saleNumber: 'SAL-000001',
    locationId: LOCATIONS.alpha.id,
    status: 'draft',
    items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '10', unitPrice: '150.00' }],
  });

  // SAL-2 (confirmed) — Gadget x20 at Beta — AFFECTS stock (outbound)
  await factory.createTestSale({
    id: SALES.sal2.id,
    tenantId: TENANT_A_ID,
    saleNumber: 'SAL-000002',
    locationId: LOCATIONS.beta.id,
    status: 'confirmed',
    items: [{ itemId: ITEMS.gadget.id, unitId: UNITS.piece.id, quantity: '20', unitPrice: '300.00' }],
  });

  // SAL-3 (dispatched) — Bolt x100 at Alpha — AFFECTS stock (outbound)
  await factory.createTestSale({
    id: SALES.sal3.id,
    tenantId: TENANT_A_ID,
    saleNumber: 'SAL-000003',
    locationId: LOCATIONS.alpha.id,
    status: 'dispatched',
    items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '100', unitPrice: '8.00' }],
  });

  // TFR-1 (dispatched) — Widget x50 Alpha→Beta — AFFECTS stock (outbound from Alpha, inTransit at Beta)
  await factory.createTestTransfer({
    id: TRANSFERS.tfr1.id,
    tenantId: TENANT_A_ID,
    transferNumber: 'TFR-000001',
    originLocationId: LOCATIONS.alpha.id,
    destLocationId: LOCATIONS.beta.id,
    status: 'dispatched',
    items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, sentQty: '50' }],
  });

  // TFR-2 (received) — Spring x100 Beta→Alpha, receivedQty=95 — AFFECTS stock
  await factory.createTestTransfer({
    id: TRANSFERS.tfr2.id,
    tenantId: TENANT_A_ID,
    transferNumber: 'TFR-000002',
    originLocationId: LOCATIONS.beta.id,
    destLocationId: LOCATIONS.alpha.id,
    status: 'received',
    items: [{ itemId: ITEMS.spring.id, unitId: UNITS.piece.id, sentQty: '100', receivedQty: '95', shortage: '5' }],
  });

  // ADJ-1 (draft) — Widget +25 at Alpha — should NOT affect stock
  await factory.createTestAdjustment({
    id: ADJUSTMENTS.adj1.id,
    tenantId: TENANT_A_ID,
    adjustmentNumber: 'ADJ-000001',
    locationId: LOCATIONS.alpha.id,
    type: 'qty',
    status: 'draft',
    items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, qtyChange: '25' }],
  });

  // ADJ-2 (approved) — Nut -10 at Alpha — AFFECTS stock (outbound)
  await factory.createTestAdjustment({
    id: ADJUSTMENTS.adj2.id,
    tenantId: TENANT_A_ID,
    adjustmentNumber: 'ADJ-000002',
    locationId: LOCATIONS.alpha.id,
    type: 'qty',
    status: 'approved',
    items: [{ itemId: ITEMS.nut.id, unitId: UNITS.piece.id, qtyChange: '-10' }],
  });
});

afterAll(async () => {
  await cleanupAllTestData();
});

// Helper to find a specific stock level
async function getStock(itemId: string, locationId: string) {
  const levels = await queryStockLevels(db, TENANT_A_ID, { itemId, locationId });
  return levels[0] ?? null;
}

// ── Stock Level Tests ─────────────────────────────────────────────────────────

describe('Stock Levels VIEW', () => {
  describe('Received purchases create inbound stock', () => {
    it('Widget at Beta: currentStock=200 from PUR-3 (received)', async () => {
      const stock = await getStock(ITEMS.widget.id, LOCATIONS.beta.id);
      // PUR-3 received: +200 inbound
      // TFR-1 dispatched: Widget 50 in_transit at Beta (not yet received, so NOT in totalIn)
      expect(Number(stock?.totalIn)).toBe(200);
      expect(Number(stock?.currentStock)).toBe(200);
    });

    it('Spring at Beta: 300 in from PUR-3, 100 out from TFR-2 (sent_qty), currentStock=200', async () => {
      const stock = await getStock(ITEMS.spring.id, LOCATIONS.beta.id);
      // PUR-3 received: Spring +300 inbound at Beta
      // TFR-2 received: Spring sent 100 from Beta (origin) — outbound from Beta
      expect(Number(stock?.totalIn)).toBe(300);
      expect(Number(stock?.totalOut)).toBe(100);
      expect(Number(stock?.currentStock)).toBe(200);
    });
  });

  describe('Draft/ordered purchases do NOT affect stock', () => {
    it('PUR-1 draft: Widget not added to Alpha stock from this purchase', async () => {
      const stock = await getStock(ITEMS.widget.id, LOCATIONS.alpha.id);
      // Alpha has no inbound from PUR-1 (draft) — only outbound from TFR-1 (50 dispatched)
      expect(Number(stock?.totalIn)).toBe(0);
      expect(Number(stock?.totalOut)).toBe(50);
    });

    it('PUR-2 ordered: Bolt not added to Alpha stock from this purchase', async () => {
      const stock = await getStock(ITEMS.bolt.id, LOCATIONS.alpha.id);
      // Bolt@Alpha only has outbound from SAL-3 (dispatched, 100) — PUR-2 (ordered) does NOT count
      expect(Number(stock?.totalIn)).toBe(0);
      expect(Number(stock?.totalOut)).toBe(100);
    });
  });

  describe('Confirmed/dispatched sales create outbound stock', () => {
    it('Bolt at Alpha: 100 out from SAL-3 (dispatched)', async () => {
      const stock = await getStock(ITEMS.bolt.id, LOCATIONS.alpha.id);
      expect(Number(stock?.totalOut)).toBe(100);
      expect(Number(stock?.currentStock)).toBe(-100);
    });

    it('Gadget at Beta: 20 out from SAL-2 (confirmed)', async () => {
      const stock = await getStock(ITEMS.gadget.id, LOCATIONS.beta.id);
      expect(Number(stock?.totalOut)).toBe(20);
      expect(Number(stock?.currentStock)).toBe(-20);
    });
  });

  describe('Draft sales do NOT affect stock', () => {
    it('SAL-1 draft Widget sale is not reflected in Widget@Alpha outbound', async () => {
      const stock = await getStock(ITEMS.widget.id, LOCATIONS.alpha.id);
      // Widget@Alpha only has TFR-1 outbound (50) — SAL-1 draft does NOT count
      expect(Number(stock?.totalOut)).toBe(50);
    });
  });

  describe('Transfers affect both locations', () => {
    it('TFR-1 dispatched: Widget 50 out from Alpha (totalOut), 50 inTransit at Beta', async () => {
      const alphaStock = await getStock(ITEMS.widget.id, LOCATIONS.alpha.id);
      expect(Number(alphaStock?.totalOut)).toBe(50);
      expect(Number(alphaStock?.currentStock)).toBe(-50);

      const betaStock = await getStock(ITEMS.widget.id, LOCATIONS.beta.id);
      expect(Number(betaStock?.inTransit)).toBe(50);
    });

    it('TFR-2 received: Spring 95 in at Alpha (uses receivedQty)', async () => {
      const stock = await getStock(ITEMS.spring.id, LOCATIONS.alpha.id);
      // TFR-2 received at Alpha: COALESCE(received_qty=95, sent_qty=100) = 95
      expect(Number(stock?.totalIn)).toBe(95);
      expect(Number(stock?.currentStock)).toBe(95);
    });
  });

  describe('Approved adjustments affect stock', () => {
    it('ADJ-2 approved: Nut -10 at Alpha (negative qty_change → outbound)', async () => {
      const stock = await getStock(ITEMS.nut.id, LOCATIONS.alpha.id);
      expect(Number(stock?.totalOut)).toBe(10);
      expect(Number(stock?.currentStock)).toBe(-10);
    });
  });

  describe('Draft adjustments do NOT affect stock', () => {
    it('ADJ-1 draft: Widget +25 at Alpha is NOT in stock levels', async () => {
      // Widget@Alpha outbound = 50 from TFR-1 only — draft adj does not contribute
      const stock = await getStock(ITEMS.widget.id, LOCATIONS.alpha.id);
      expect(Number(stock?.totalIn)).toBe(0); // no inbound from approved sources at Alpha
    });
  });

  describe('Filtering', () => {
    it('queryStockLevels with itemId filter returns only that item', async () => {
      const levels = await queryStockLevels(db, TENANT_A_ID, { itemId: ITEMS.widget.id });
      levels.forEach((level) => expect(level.itemId).toBe(ITEMS.widget.id));
      expect(levels.length).toBeGreaterThan(0);
    });
  });
});
