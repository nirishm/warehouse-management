import { z } from 'zod';

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with dashes'),
  type: z.enum(['warehouse', 'store', 'yard', 'external']),
  address: z.string().optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

export type LocationType = 'warehouse' | 'store' | 'yard' | 'external';

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address: string | null;
  is_active: boolean;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
