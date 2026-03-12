import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['supplier', 'customer', 'both']),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  gstNumber: z.string().max(20).optional(),
  address: z.string().max(1000).optional(),
  creditLimit: z.string().optional(),
  paymentTerms: z.number().int().min(0).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
