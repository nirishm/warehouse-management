import { z } from 'zod';

export const receiveDispatchSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        received_quantity: z.number().min(0, 'Quantity must be >= 0'),
        received_bags: z.number().int().min(0).optional(),
      })
    )
    .min(1, 'At least one item required'),
});

export type ReceiveDispatchInput = z.infer<typeof receiveDispatchSchema>;
