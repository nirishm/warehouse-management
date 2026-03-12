import { z } from 'zod';

const saleItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  quantity: z.string().min(1),  // numeric string
  unitPrice: z.string().min(1), // numeric string
});

export const createSaleSchema = z.object({
  contactId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.enum(['draft', 'confirmed', 'dispatched', 'cancelled']).optional(),
  shippingAddress: z.string().max(1000).optional(),
  trackingNumber: z.string().max(255).optional(),
  customStatus: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  items: z.array(saleItemSchema).min(1),
});

export const updateSaleSchema = z.object({
  contactId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  shippingAddress: z.string().max(1000).optional(),
  trackingNumber: z.string().max(255).optional(),
  customStatus: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  items: z.array(saleItemSchema).optional(),
});

export const updateSaleStatusSchema = z.object({
  status: z.enum(['draft', 'confirmed', 'dispatched', 'cancelled']),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;
