import { z } from 'zod';

export const commodityRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  default_unit: z.string().optional().default(''),
});

export type CommodityRow = z.infer<typeof commodityRowSchema>;

export const COMMODITIES_TEMPLATE_HEADERS = ['name', 'code', 'description', 'category', 'default_unit'];
