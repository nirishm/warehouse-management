import { z } from 'zod';

export const createCustomFieldSchema = z.object({
  entityType: z.enum(['item', 'contact', 'sale', 'purchase', 'transfer']),
  fieldName: z.string().min(1).max(100),
  fieldType: z.enum(['text', 'number', 'date', 'boolean', 'select']),
  options: z.record(z.string(), z.unknown()).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCustomFieldSchema = createCustomFieldSchema.partial();

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
