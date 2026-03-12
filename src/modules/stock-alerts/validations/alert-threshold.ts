import { z } from 'zod';

export const createAlertThresholdSchema = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  minQuantity: z.number().positive(),
});

export const updateAlertThresholdSchema = z.object({
  minQuantity: z.number().positive(),
});

export type CreateAlertThresholdInput = z.infer<typeof createAlertThresholdSchema>;
export type UpdateAlertThresholdInput = z.infer<typeof updateAlertThresholdSchema>;
