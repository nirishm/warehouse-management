/**
 * AppEvents — typed event bus for WareOS inter-module communication.
 * Each key is an event name; the value shape matches Inngest's event schema.
 */
export type AppEvents = {
  'sale/confirmed': {
    data: { saleId: string; tenantId: string };
  };
  'sale/dispatched': {
    data: { saleId: string; tenantId: string };
  };
  'purchase/received': {
    data: { purchaseId: string; tenantId: string };
  };
  'transfer/dispatched': {
    data: { transferId: string; tenantId: string };
  };
  'transfer/received': {
    data: { transferId: string; tenantId: string };
  };
  'adjustment/approved': {
    data: { adjustmentId: string; tenantId: string };
  };
  'stock/below-threshold': {
    data: {
      itemId: string;
      locationId: string;
      tenantId: string;
      current: number;
      threshold: number;
    };
  };
  'user/invited': {
    data: { email: string; tenantId: string; role: string };
  };
  'tenant/provisioned': {
    data: { tenantId: string; tenantSlug: string };
  };
};
