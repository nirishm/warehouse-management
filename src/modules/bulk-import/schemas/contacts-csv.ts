import { z } from 'zod';

export const contactRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['supplier', 'customer', 'both']).refine(
    (v) => ['supplier', 'customer', 'both'].includes(v),
    { message: 'type must be supplier, customer, or both' }
  ),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  address: z.string().optional().default(''),
});

export type ContactRow = z.infer<typeof contactRowSchema>;

export const CONTACTS_TEMPLATE_HEADERS = ['name', 'type', 'phone', 'email', 'address'];
