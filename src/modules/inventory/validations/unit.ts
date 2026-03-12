import { z } from 'zod';

export const createUnitSchema = z.object({
  name: z.string().min(1).max(100),
  abbreviation: z.string().min(1).max(20),
  type: z.enum(['weight', 'volume', 'length', 'count', 'area']),
  baseUnitId: z.string().uuid().optional(),
  conversionFactor: z.string().optional(),
});

export const updateUnitSchema = createUnitSchema.partial();

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
