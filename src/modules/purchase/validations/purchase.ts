import { z } from 'zod';

const purchaseItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  quantity: z.string().min(1),  // numeric string
  unitPrice: z.string().min(1), // numeric string
});

export const createPurchaseSchema = z.object({
  contactId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.enum(['draft', 'ordered', 'received', 'cancelled']).optional(),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  items: z.array(purchaseItemSchema).min(1),
});

export const updatePurchaseSchema = z.object({
  contactId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  items: z.array(purchaseItemSchema).optional(),
});

export const updatePurchaseStatusSchema = z.object({
  status: z.enum(['draft', 'ordered', 'received', 'cancelled']),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
