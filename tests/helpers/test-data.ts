import { randomUUID } from 'crypto';

export const TENANT_A_ID = randomUUID();
export const TENANT_B_ID = randomUUID();
export const TENANT_A_SLUG = `test-ta-${TENANT_A_ID.slice(0, 8)}`;
export const TENANT_B_SLUG = `test-tb-${TENANT_B_ID.slice(0, 8)}`;

export const USERS = {
  owner: {
    id: randomUUID(),
    email: `owner-${randomUUID().slice(0, 6)}@test.local`,
    role: 'owner' as const,
    profileId: randomUUID(),
  },
  admin1: {
    id: randomUUID(),
    email: `admin1-${randomUUID().slice(0, 6)}@test.local`,
    role: 'admin' as const,
    profileId: randomUUID(),
  },
  admin2: {
    id: randomUUID(),
    email: `admin2-${randomUUID().slice(0, 6)}@test.local`,
    role: 'admin' as const,
    profileId: randomUUID(),
  },
  manager1: {
    id: randomUUID(),
    email: `manager1-${randomUUID().slice(0, 6)}@test.local`,
    role: 'manager' as const,
    profileId: randomUUID(),
  },
  manager2: {
    id: randomUUID(),
    email: `manager2-${randomUUID().slice(0, 6)}@test.local`,
    role: 'manager' as const,
    profileId: randomUUID(),
  },
  operator1: {
    id: randomUUID(),
    email: `operator1-${randomUUID().slice(0, 6)}@test.local`,
    role: 'operator' as const,
    profileId: randomUUID(),
  },
  operator2: {
    id: randomUUID(),
    email: `operator2-${randomUUID().slice(0, 6)}@test.local`,
    role: 'operator' as const,
    profileId: randomUUID(),
  },
  viewer1: {
    id: randomUUID(),
    email: `viewer1-${randomUUID().slice(0, 6)}@test.local`,
    role: 'viewer' as const,
    profileId: randomUUID(),
  },
  viewer2: {
    id: randomUUID(),
    email: `viewer2-${randomUUID().slice(0, 6)}@test.local`,
    role: 'viewer' as const,
    profileId: randomUUID(),
  },
  crossTenant: {
    id: randomUUID(),
    email: `cross-${randomUUID().slice(0, 6)}@test.local`,
    role: 'viewer' as const, // viewer in A, admin in B
    profileId: randomUUID(),
  },
};

export const LOCATIONS = {
  alpha: {
    id: randomUUID(),
    name: 'Warehouse Alpha',
    code: `WH-A-${randomUUID().slice(0, 4)}`,
    type: 'warehouse' as const,
  },
  beta: {
    id: randomUUID(),
    name: 'Warehouse Beta',
    code: `WH-B-${randomUUID().slice(0, 4)}`,
    type: 'warehouse' as const,
  },
  store: {
    id: randomUUID(),
    name: 'Store Front',
    code: `SF-${randomUUID().slice(0, 4)}`,
    type: 'store' as const,
  },
};

export const UNITS = {
  piece: {
    id: randomUUID(),
    name: 'Piece',
    abbreviation: 'pc',
    type: 'count' as const,
  },
  kilogram: {
    id: randomUUID(),
    name: 'Kilogram',
    abbreviation: 'kg',
    type: 'weight' as const,
  },
  box: {
    id: randomUUID(),
    name: 'Box',
    abbreviation: 'box',
    type: 'count' as const,
  },
};

export const ITEMS = {
  widget: {
    id: randomUUID(),
    name: 'Widget',
    code: `ITM-W-${randomUUID().slice(0, 4)}`,
    purchasePrice: '100.00',
    sellingPrice: '150.00',
  },
  gadget: {
    id: randomUUID(),
    name: 'Gadget',
    code: `ITM-G-${randomUUID().slice(0, 4)}`,
    purchasePrice: '200.00',
    sellingPrice: '300.00',
  },
  bolt: {
    id: randomUUID(),
    name: 'Bolt',
    code: `ITM-B-${randomUUID().slice(0, 4)}`,
    purchasePrice: '5.00',
    sellingPrice: '8.00',
  },
  nut: {
    id: randomUUID(),
    name: 'Nut',
    code: `ITM-N-${randomUUID().slice(0, 4)}`,
    purchasePrice: '3.00',
    sellingPrice: '5.00',
  },
  spring: {
    id: randomUUID(),
    name: 'Spring',
    code: `ITM-S-${randomUUID().slice(0, 4)}`,
    purchasePrice: '15.00',
    sellingPrice: '25.00',
  },
};

export const CONTACTS = {
  supplierA: {
    id: randomUUID(),
    name: 'Supplier Alpha',
    type: 'supplier' as const,
  },
  supplierB: {
    id: randomUUID(),
    name: 'Supplier Beta',
    type: 'supplier' as const,
  },
  customerA: {
    id: randomUUID(),
    name: 'Customer Alpha',
    type: 'customer' as const,
  },
  customerB: {
    id: randomUUID(),
    name: 'Customer Beta',
    type: 'customer' as const,
  },
};

export const PURCHASES = {
  pur1: { id: randomUUID() }, // draft
  pur2: { id: randomUUID() }, // ordered
  pur3: { id: randomUUID() }, // received
};

export const SALES = {
  sal1: { id: randomUUID() }, // draft
  sal2: { id: randomUUID() }, // confirmed
  sal3: { id: randomUUID() }, // dispatched
};

export const TRANSFERS = {
  tfr1: { id: randomUUID() }, // dispatched (Alpha→Beta, Widget x50)
  tfr2: { id: randomUUID() }, // received (Beta→Alpha, Spring x100, received 95)
};

export const ADJUSTMENTS = {
  adj1: { id: randomUUID() }, // draft
  adj2: { id: randomUUID() }, // approved
};

export const PAYMENTS = {
  pay1: { id: randomUUID() }, // linked to pur3
  pay2: { id: randomUUID() }, // linked to sal3
  pay3: { id: randomUUID() }, // linked to sal2
};

export const ALERT_THRESHOLDS = {
  widgetAlpha: { id: randomUUID() },
  boltBeta: { id: randomUUID() },
};

export const CUSTOM_FIELDS = {
  itemBatch: { id: randomUUID() },
  purchasePO: { id: randomUUID() },
};

export const USER_LOCATIONS = {
  manager1Alpha: { id: randomUUID() },
  manager2Beta: { id: randomUUID() },
  operator1Alpha: { id: randomUUID() },
  operator2Beta: { id: randomUUID() },
  viewer2Alpha: { id: randomUUID() },
};
