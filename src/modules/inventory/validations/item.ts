import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  sku: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  type: z.enum(['goods', 'service', 'composite']).default('goods'),
  defaultUnitId: z.string().uuid().optional(),
  purchasePrice: z.string().optional(),
  sellingPrice: z.string().optional(),
  hsnCode: z.string().max(20).optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  shelfLifeDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const updateItemSchema = createItemSchema.partial();

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
