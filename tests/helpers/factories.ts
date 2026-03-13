import { db } from '@/core/db/drizzle';
import { sql } from 'drizzle-orm';
import {
  tenants,
  userTenants,
  userProfiles,
  userLocations,
  units,
  locations,
  items,
  contacts,
  purchases,
  purchaseItems,
  sales,
  saleItems,
  transfers,
  transferItems,
  adjustments,
  adjustmentItems,
  payments,
  alertThresholds,
  customFieldDefinitions,
  auditLog,
} from '@/core/db/schema';

// ── Auth users ────────────────────────────────────────────────────────────────
// Insert minimal rows into auth.users so user_tenants FK is satisfied.
// All columns except id are nullable, so this is the minimum required.

export async function createAuthUser(data: { id: string; email: string }) {
  await db.execute(sql`
    INSERT INTO auth.users (id, email, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      ${data.id}::uuid,
      ${data.email},
      'authenticated',
      'authenticated',
      now(),
      now(),
      '{}'::jsonb,
      '{}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING
  `);
}

// ── Tenants ──────────────────────────────────────────────────────────────────

export async function createTestTenant(data: {
  id: string;
  name: string;
  slug: string;
  enabledModules?: string[];
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
}) {
  const [row] = await db
    .insert(tenants)
    .values({
      id: data.id,
      name: data.name,
      slug: data.slug,
      status: 'active',
      enabledModules: data.enabledModules ?? ['inventory'],
      plan: data.plan ?? 'starter',
    })
    .returning();
  return row;
}

// ── User memberships ──────────────────────────────────────────────────────────

export async function createUserMembership(data: {
  id?: string;
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'manager' | 'operator' | 'viewer';
  isDefault?: boolean;
}) {
  const [row] = await db
    .insert(userTenants)
    .values({
      ...(data.id ? { id: data.id } : {}),
      userId: data.userId,
      tenantId: data.tenantId,
      role: data.role,
      isDefault: data.isDefault ?? false,
    })
    .returning();
  return row;
}

// ── User profiles ─────────────────────────────────────────────────────────────

export async function createUserProfile(data: {
  id: string;
  userId: string;
  tenantId: string;
  displayName?: string;
}) {
  const [row] = await db
    .insert(userProfiles)
    .values({
      id: data.id,
      userId: data.userId,
      tenantId: data.tenantId,
      displayName: data.displayName ?? null,
    })
    .returning();
  return row;
}

// ── User locations ────────────────────────────────────────────────────────────

export async function createUserLocation(data: {
  id: string;
  userId: string;
  tenantId: string;
  locationId: string;
}) {
  const [row] = await db
    .insert(userLocations)
    .values({
      id: data.id,
      userId: data.userId,
      tenantId: data.tenantId,
      locationId: data.locationId,
    })
    .returning();
  return row;
}

// ── Units ─────────────────────────────────────────────────────────────────────

export async function createTestUnit(data: {
  id: string;
  tenantId: string;
  name: string;
  abbreviation: string;
  type: 'weight' | 'volume' | 'length' | 'count' | 'area';
}) {
  const [row] = await db
    .insert(units)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      abbreviation: data.abbreviation,
      type: data.type,
    })
    .returning();
  return row;
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function createTestLocation(data: {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: 'warehouse' | 'store' | 'yard' | 'external';
}) {
  const [row] = await db
    .insert(locations)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      type: data.type,
      isActive: true,
    })
    .returning();
  return row;
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function createTestItem(data: {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  defaultUnitId?: string;
  purchasePrice?: string;
  sellingPrice?: string;
}) {
  const [row] = await db
    .insert(items)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      defaultUnitId: data.defaultUnitId ?? null,
      purchasePrice: data.purchasePrice ?? null,
      sellingPrice: data.sellingPrice ?? null,
      isActive: true,
    })
    .returning();
  return row;
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function createTestContact(data: {
  id: string;
  tenantId: string;
  name: string;
  type: 'supplier' | 'customer' | 'both';
}) {
  const [row] = await db
    .insert(contacts)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      type: data.type,
      isActive: true,
    })
    .returning();
  return row;
}

// ── Purchases ─────────────────────────────────────────────────────────────────

export async function createTestPurchase(data: {
  id: string;
  tenantId: string;
  purchaseNumber: string;
  contactId?: string;
  locationId?: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  items: Array<{
    id?: string;
    itemId: string;
    unitId?: string;
    quantity: string;
    unitPrice: string;
  }>;
}) {
  const [purchase] = await db
    .insert(purchases)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      purchaseNumber: data.purchaseNumber,
      contactId: data.contactId ?? null,
      locationId: data.locationId ?? null,
      status: data.status,
      updatedAt: new Date(),
    })
    .returning();

  const lineItems =
    data.items.length > 0
      ? await db
          .insert(purchaseItems)
          .values(
            data.items.map((item) => ({
              ...(item.id ? { id: item.id } : {}),
              purchaseId: purchase.id,
              itemId: item.itemId,
              unitId: item.unitId ?? null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          )
          .returning()
      : [];

  return { ...purchase, items: lineItems };
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function createTestSale(data: {
  id: string;
  tenantId: string;
  saleNumber: string;
  contactId?: string;
  locationId?: string;
  status: 'draft' | 'confirmed' | 'dispatched' | 'cancelled';
  items: Array<{
    id?: string;
    itemId: string;
    unitId?: string;
    quantity: string;
    unitPrice: string;
  }>;
}) {
  const [sale] = await db
    .insert(sales)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      saleNumber: data.saleNumber,
      contactId: data.contactId ?? null,
      locationId: data.locationId ?? null,
      status: data.status,
      updatedAt: new Date(),
    })
    .returning();

  const lineItems =
    data.items.length > 0
      ? await db
          .insert(saleItems)
          .values(
            data.items.map((item) => ({
              ...(item.id ? { id: item.id } : {}),
              saleId: sale.id,
              itemId: item.itemId,
              unitId: item.unitId ?? null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          )
          .returning()
      : [];

  return { ...sale, items: lineItems };
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export async function createTestTransfer(data: {
  id: string;
  tenantId: string;
  transferNumber: string;
  originLocationId?: string;
  destLocationId?: string;
  status: 'draft' | 'dispatched' | 'in_transit' | 'received';
  items: Array<{
    id?: string;
    itemId: string;
    unitId?: string;
    sentQty: string;
    receivedQty?: string;
    shortage?: string;
  }>;
}) {
  const [transfer] = await db
    .insert(transfers)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      transferNumber: data.transferNumber,
      originLocationId: data.originLocationId ?? null,
      destLocationId: data.destLocationId ?? null,
      status: data.status,
      updatedAt: new Date(),
    })
    .returning();

  const lineItems =
    data.items.length > 0
      ? await db
          .insert(transferItems)
          .values(
            data.items.map((item) => ({
              ...(item.id ? { id: item.id } : {}),
              transferId: transfer.id,
              itemId: item.itemId,
              unitId: item.unitId ?? null,
              sentQty: item.sentQty,
              receivedQty: item.receivedQty ?? null,
              shortage: item.shortage ?? null,
            })),
          )
          .returning()
      : [];

  return { ...transfer, items: lineItems };
}

// ── Adjustments ───────────────────────────────────────────────────────────────

export async function createTestAdjustment(data: {
  id: string;
  tenantId: string;
  adjustmentNumber: string;
  locationId?: string;
  reason?: string;
  type: 'qty' | 'value';
  status: 'draft' | 'approved';
  items: Array<{
    id?: string;
    itemId: string;
    unitId?: string;
    qtyChange?: string;
    valueChange?: string;
  }>;
}) {
  const [adjustment] = await db
    .insert(adjustments)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      adjustmentNumber: data.adjustmentNumber,
      locationId: data.locationId ?? null,
      reason: data.reason ?? null,
      type: data.type,
      status: data.status,
      updatedAt: new Date(),
    })
    .returning();

  const lineItems =
    data.items.length > 0
      ? await db
          .insert(adjustmentItems)
          .values(
            data.items.map((item) => ({
              ...(item.id ? { id: item.id } : {}),
              adjustmentId: adjustment.id,
              itemId: item.itemId,
              unitId: item.unitId ?? null,
              qtyChange: item.qtyChange ?? null,
              valueChange: item.valueChange ?? null,
            })),
          )
          .returning()
      : [];

  return { ...adjustment, items: lineItems };
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function createTestPayment(data: {
  id: string;
  tenantId: string;
  type: 'purchase' | 'sale';
  referenceId?: string;
  amount: string;
  paymentMethod?: string;
}) {
  const [row] = await db
    .insert(payments)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      type: data.type,
      referenceId: data.referenceId ?? null,
      amount: data.amount,
      paymentMethod: data.paymentMethod ?? null,
      paymentDate: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

// ── Alert Thresholds ──────────────────────────────────────────────────────────

export async function createTestAlertThreshold(data: {
  id: string;
  tenantId: string;
  itemId: string;
  locationId?: string;
  minQuantity: string;
}) {
  const [row] = await db
    .insert(alertThresholds)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      itemId: data.itemId,
      locationId: data.locationId ?? null,
      minQuantity: data.minQuantity,
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

// ── Custom Field Definitions ──────────────────────────────────────────────────

export async function createTestCustomField(data: {
  id: string;
  tenantId: string;
  entityType: 'item' | 'contact' | 'sale' | 'purchase' | 'transfer';
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'select';
  isRequired?: boolean;
  sortOrder?: number;
}) {
  const [row] = await db
    .insert(customFieldDefinitions)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      entityType: data.entityType,
      fieldName: data.fieldName,
      fieldType: data.fieldType,
      isRequired: data.isRequired ?? false,
      sortOrder: data.sortOrder ?? 0,
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export async function createTestAuditEntry(data: {
  tenantId: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'status_change';
  entityType: string;
  entityId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(auditLog)
    .values({
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldData: data.oldData ?? null,
      newData: data.newData ?? null,
    })
    .returning();
  return row;
}
