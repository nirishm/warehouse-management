import { z } from 'zod';

export const createCommoditySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with dashes'),
  description: z.string().optional(),
  category: z.string().optional(),
  default_unit_id: z.string().uuid().optional(),
});

export const updateCommoditySchema = createCommoditySchema.partial();

export type CreateCommodityInput = z.infer<typeof createCommoditySchema>;
export type UpdateCommodityInput = z.infer<typeof updateCommoditySchema>;
