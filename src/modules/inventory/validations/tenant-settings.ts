import { z } from 'zod';

export const updateTenantSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  timezone: z.string().optional(),
  currency: z.string().default('INR').optional(),
  date_format: z.string().optional(),
  contact_email: z.string().email('Invalid email address').optional(),
  contact_phone: z.string().optional(),
});

export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;

export interface TenantSettings {
  name: string;
  slug: string;
  plan: string;
  status: string;
  enabled_modules: string[];
  timezone: string;
  currency: string;
  date_format: string;
  contact_email: string | null;
  contact_phone: string | null;
}
