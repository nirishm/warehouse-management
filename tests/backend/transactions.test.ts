import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock Inngest BEFORE any query module imports
vi.mock('@/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ['mock'] }) },
}));

import * as factory from '../helpers/factories';
import { cleanupAllTestData } from '../helpers/cleanup';
import { TENANT_A_ID, TENANT_A_SLUG, UNITS, LOCATIONS, ITEMS, CONTACTS } from '../helpers/test-data';
import { createPurchase, updatePurchaseStatus, softDeletePurchase } from '@/modules/purchase/queries/purchases';
import { createSale, updateSaleStatus } from '@/modules/sale/queries/sales';
import { createTransfer, updateTransferStatus } from '@/modules/transfer/queries/transfers';
import { createAdjustment, approveAdjustment } from '@/modules/adjustments/queries/adjustments';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000099';

beforeAll(async () => {
  await cleanupAllTestData();

  await factory.createTestTenant({
    id: TENANT_A_ID,
    name: 'Transaction Test Co',
    slug: TENANT_A_SLUG,
    enabledModules: ['inventory', 'purchases', 'sales', 'transfers', 'adjustments'],
    plan: 'pro',
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
  await factory.createTestLocation({
    id: LOCATIONS.beta.id,
    tenantId: TENANT_A_ID,
    name: LOCATIONS.beta.name,
    code: LOCATIONS.beta.code,
    type: LOCATIONS.beta.type,
  });
  await factory.createTestContact({
    id: CONTACTS.supplierA.id,
    tenantId: TENANT_A_ID,
    name: CONTACTS.supplierA.name,
    type: CONTACTS.supplierA.type,
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

// ── Purchase Lifecycle ─────────────────────────────────────────────────────────

describe('Transaction Lifecycles', () => {
  describe('Purchase: draft → ordered → received', () => {
    it('createPurchase returns draft with purchaseNumber', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        {
          contactId: CONTACTS.supplierA.id,
          locationId: LOCATIONS.alpha.id,
          items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '10', unitPrice: '100.00' }],
        },
        TEST_USER_ID,
      );

      expect(purchase.status).toBe('draft');
      expect(purchase.purchaseNumber).toMatch(/^PUR-/);
      expect(purchase.tenantId).toBe(TENANT_A_ID);
      expect(purchase.items).toHaveLength(1);
    });

    it('draft → ordered succeeds', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '50', unitPrice: '5.00' }] },
        TEST_USER_ID,
      );

      const updated = await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'ordered', TEST_USER_ID);
      expect(updated?.status).toBe('ordered');
    });

    it('ordered → received succeeds', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '50', unitPrice: '5.00' }] },
        TEST_USER_ID,
      );
      await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'ordered', TEST_USER_ID);

      const updated = await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'received', TEST_USER_ID);
      expect(updated?.status).toBe('received');
    });

    it('received → draft throws INVALID_TRANSITION', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.nut.id, unitId: UNITS.piece.id, quantity: '10', unitPrice: '3.00' }] },
        TEST_USER_ID,
      );
      await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'ordered', TEST_USER_ID);
      await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'received', TEST_USER_ID);

      await expect(
        updatePurchaseStatus(TENANT_A_ID, purchase.id, 'draft', TEST_USER_ID),
      ).rejects.toThrow();
    });

    it('ordered → draft throws INVALID_TRANSITION', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.spring.id, unitId: UNITS.piece.id, quantity: '10', unitPrice: '15.00' }] },
        TEST_USER_ID,
      );
      await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'ordered', TEST_USER_ID);

      await expect(
        updatePurchaseStatus(TENANT_A_ID, purchase.id, 'draft', TEST_USER_ID),
      ).rejects.toThrow();
    });

    it('draft → cancelled succeeds', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.gadget.id, unitId: UNITS.piece.id, quantity: '5', unitPrice: '200.00' }] },
        TEST_USER_ID,
      );

      const updated = await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'cancelled', TEST_USER_ID);
      expect(updated?.status).toBe('cancelled');
    });

    it('softDeletePurchase succeeds for draft', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '1', unitPrice: '100.00' }] },
        TEST_USER_ID,
      );

      const deleted = await softDeletePurchase(TENANT_A_ID, purchase.id, TEST_USER_ID);
      expect(deleted?.id).toBe(purchase.id);
    });

    it('softDeletePurchase rejects non-draft purchase', async () => {
      const purchase = await createPurchase(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '1', unitPrice: '5.00' }] },
        TEST_USER_ID,
      );
      await updatePurchaseStatus(TENANT_A_ID, purchase.id, 'ordered', TEST_USER_ID);

      await expect(
        softDeletePurchase(TENANT_A_ID, purchase.id, TEST_USER_ID),
      ).rejects.toThrow();
    });
  });

  // ── Sale Lifecycle ─────────────────────────────────────────────────────────

  describe('Sale: draft → confirmed → dispatched', () => {
    it('createSale returns draft with saleNumber', async () => {
      const sale = await createSale(
        TENANT_A_ID,
        {
          locationId: LOCATIONS.alpha.id,
          items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '5', unitPrice: '150.00' }],
        },
        TEST_USER_ID,
      );

      expect(sale.status).toBe('draft');
      expect(sale.saleNumber).toMatch(/^SAL-/);
      expect(sale.tenantId).toBe(TENANT_A_ID);
    });

    it('draft → confirmed succeeds', async () => {
      const sale = await createSale(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.gadget.id, unitId: UNITS.piece.id, quantity: '2', unitPrice: '300.00' }] },
        TEST_USER_ID,
      );

      const updated = await updateSaleStatus(TENANT_A_ID, sale.id, 'confirmed', TEST_USER_ID);
      expect(updated?.status).toBe('confirmed');
    });

    it('confirmed → dispatched succeeds', async () => {
      const sale = await createSale(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, quantity: '10', unitPrice: '8.00' }] },
        TEST_USER_ID,
      );
      await updateSaleStatus(TENANT_A_ID, sale.id, 'confirmed', TEST_USER_ID);

      const updated = await updateSaleStatus(TENANT_A_ID, sale.id, 'dispatched', TEST_USER_ID);
      expect(updated?.status).toBe('dispatched');
    });

    it('dispatched → confirmed throws INVALID_TRANSITION', async () => {
      const sale = await createSale(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.nut.id, unitId: UNITS.piece.id, quantity: '5', unitPrice: '2.00' }] },
        TEST_USER_ID,
      );
      await updateSaleStatus(TENANT_A_ID, sale.id, 'confirmed', TEST_USER_ID);
      await updateSaleStatus(TENANT_A_ID, sale.id, 'dispatched', TEST_USER_ID);

      await expect(
        updateSaleStatus(TENANT_A_ID, sale.id, 'confirmed', TEST_USER_ID),
      ).rejects.toThrow();
    });

    it('draft → cancelled succeeds', async () => {
      const sale = await createSale(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.spring.id, unitId: UNITS.piece.id, quantity: '1', unitPrice: '15.00' }] },
        TEST_USER_ID,
      );

      const updated = await updateSaleStatus(TENANT_A_ID, sale.id, 'cancelled', TEST_USER_ID);
      expect(updated?.status).toBe('cancelled');
    });

    it('confirmed → cancelled succeeds', async () => {
      const sale = await createSale(
        TENANT_A_ID,
        { items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, quantity: '1', unitPrice: '150.00' }] },
        TEST_USER_ID,
      );
      await updateSaleStatus(TENANT_A_ID, sale.id, 'confirmed', TEST_USER_ID);

      const updated = await updateSaleStatus(TENANT_A_ID, sale.id, 'cancelled', TEST_USER_ID);
      expect(updated?.status).toBe('cancelled');
    });
  });

  // ── Transfer Lifecycle ─────────────────────────────────────────────────────

  describe('Transfer: draft → dispatched → in_transit → received', () => {
    it('createTransfer returns draft with transferNumber', async () => {
      const transfer = await createTransfer(
        TENANT_A_ID,
        {
          originLocationId: LOCATIONS.alpha.id,
          destLocationId: LOCATIONS.beta.id,
          items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, sentQty: '10' }],
        },
        TEST_USER_ID,
      );

      expect(transfer.status).toBe('draft');
      expect(transfer.transferNumber).toMatch(/^TFR-/);
      expect(transfer.tenantId).toBe(TENANT_A_ID);
    });

    it('draft → dispatched succeeds', async () => {
      const transfer = await createTransfer(
        TENANT_A_ID,
        {
          originLocationId: LOCATIONS.alpha.id,
          destLocationId: LOCATIONS.beta.id,
          items: [{ itemId: ITEMS.bolt.id, unitId: UNITS.piece.id, sentQty: '20' }],
        },
        TEST_USER_ID,
      );

      const updated = await updateTransferStatus(TENANT_A_ID, transfer.id, 'dispatched', TEST_USER_ID);
      expect(updated?.status).toBe('dispatched');
    });

    it('dispatched → in_transit succeeds', async () => {
      const transfer = await createTransfer(
        TENANT_A_ID,
        {
          originLocationId: LOCATIONS.beta.id,
          destLocationId: LOCATIONS.alpha.id,
          items: [{ itemId: ITEMS.spring.id, unitId: UNITS.piece.id, sentQty: '5' }],
        },
        TEST_USER_ID,
      );
      await updateTransferStatus(TENANT_A_ID, transfer.id, 'dispatched', TEST_USER_ID);

      const updated = await updateTransferStatus(TENANT_A_ID, transfer.id, 'in_transit', TEST_USER_ID);
      expect(updated?.status).toBe('in_transit');
    });

    it('in_transit → received succeeds', async () => {
      const transfer = await createTransfer(
        TENANT_A_ID,
        {
          originLocationId: LOCATIONS.alpha.id,
          destLocationId: LOCATIONS.beta.id,
          items: [{ itemId: ITEMS.gadget.id, unitId: UNITS.piece.id, sentQty: '3' }],
        },
        TEST_USER_ID,
      );
      await updateTransferStatus(TENANT_A_ID, transfer.id, 'dispatched', TEST_USER_ID);
      await updateTransferStatus(TENANT_A_ID, transfer.id, 'in_transit', TEST_USER_ID);

      const updated = await updateTransferStatus(TENANT_A_ID, transfer.id, 'received', TEST_USER_ID);
      expect(updated?.status).toBe('received');
    });

    it('received → dispatched throws INVALID_TRANSITION', async () => {
      const transfer = await createTransfer(
        TENANT_A_ID,
        {
          originLocationId: LOCATIONS.alpha.id,
          destLocationId: LOCATIONS.beta.id,
          items: [{ itemId: ITEMS.nut.id, unitId: UNITS.piece.id, sentQty: '2' }],
        },
        TEST_USER_ID,
      );
      await updateTransferStatus(TENANT_A_ID, transfer.id, 'dispatched', TEST_USER_ID);
      await updateTransferStatus(TENANT_A_ID, transfer.id, 'in_transit', TEST_USER_ID);
      await updateTransferStatus(TENANT_A_ID, transfer.id, 'received', TEST_USER_ID);

      await expect(
        updateTransferStatus(TENANT_A_ID, transfer.id, 'dispatched', TEST_USER_ID),
      ).rejects.toThrow();
    });
  });

  // ── Adjustment Lifecycle ──────────────────────────────────────────────────

  describe('Adjustment: draft → approved', () => {
    it('createAdjustment returns draft with adjustmentNumber', async () => {
      const adj = await createAdjustment(
        TENANT_A_ID,
        {
          locationId: LOCATIONS.alpha.id,
          type: 'qty',
          items: [{ itemId: ITEMS.widget.id, unitId: UNITS.piece.id, qtyChange: '10' }],
        },
        TEST_USER_ID,
      );

      expect(adj.status).toBe('draft');
      expect(adj.adjustmentNumber).toMatch(/^ADJ-/);
      expect(adj.tenantId).toBe(TENANT_A_ID);
    });

    it('draft → approved succeeds', async () => {
      const adj = await createAdjustment(
        TENANT_A_ID,
        {
          locationId: LOCATIONS.alpha.id,
          type: 'qty',
          items: [{ itemId: ITEMS.nut.id, unitId: UNITS.piece.id, qtyChange: '-5' }],
        },
        TEST_USER_ID,
      );

      const approved = await approveAdjustment(TENANT_A_ID, adj.id, TEST_USER_ID);
      expect(approved?.status).toBe('approved');
    });

    it('approved → draft throws INVALID_STATE', async () => {
      const adj = await createAdjustment(
        TENANT_A_ID,
        {
          locationId: LOCATIONS.alpha.id,
          type: 'qty',
          items: [{ itemId: ITEMS.spring.id, unitId: UNITS.piece.id, qtyChange: '3' }],
        },
        TEST_USER_ID,
      );
      await approveAdjustment(TENANT_A_ID, adj.id, TEST_USER_ID);

      // approveAdjustment on an already-approved adjustment throws INVALID_STATE
      await expect(
        approveAdjustment(TENANT_A_ID, adj.id, TEST_USER_ID),
      ).rejects.toThrow();
    });
  });
});
