import { z } from 'zod';

const adjustmentItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  qtyChange: z.string().optional(),   // can be positive or negative
  valueChange: z.string().optional(),
});

export const createAdjustmentSchema = z.object({
  locationId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
  type: z.enum(['qty', 'value']),
  notes: z.string().max(5000).optional(),
  items: z.array(adjustmentItemSchema).min(1),
});

export const updateAdjustmentSchema = z.object({
  locationId: z.string().uuid().optional(),
  reason: z.string().max(1000).optional(),
  notes: z.string().max(5000).optional(),
  items: z.array(adjustmentItemSchema).optional(),
});

export const approveAdjustmentSchema = z.object({
  status: z.literal('approved'),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type UpdateAdjustmentInput = z.infer<typeof updateAdjustmentSchema>;
