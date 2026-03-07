import { z } from 'zod';

export const CONTACT_TYPES = [
  { value: 'supplier', label: 'Supplier' },
  { value: 'customer', label: 'Customer' },
  { value: 'both', label: 'Both' },
] as const;

export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['supplier', 'customer', 'both']),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export type ContactType = 'supplier' | 'customer' | 'both';
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
