import { z } from 'zod';

export const createLocationSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  type: z.enum(['warehouse', 'store', 'yard', 'external']).default('warehouse'),
  address: z.string().max(1000).optional(),
  geoPoint: z.record(z.string(), z.unknown()).optional(),
  capacity: z.number().int().min(0).optional(),
  parentLocationId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
