import { z } from 'zod';

export const createPaymentSchema = z.object({
  type: z.enum(['purchase', 'sale']),
  referenceId: z.string().uuid(),
  amount: z.string().min(1),
  paymentMethod: z.string().optional(),
  paymentDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
});

export const updatePaymentSchema = z.object({
  amount: z.string().min(1).optional(),
  paymentMethod: z.string().optional(),
  paymentDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
