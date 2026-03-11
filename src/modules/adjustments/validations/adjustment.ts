import { z } from 'zod';

export const createAdjustmentSchema = z.object({
  location_id: z.string().uuid('Invalid location'),
  commodity_id: z.string().uuid('Invalid item'),
  unit_id: z.string().uuid('Invalid unit'),
  reason_id: z.string().uuid('Invalid reason'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  notes: z.string().optional().nullable(),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;

export const createAdjustmentReasonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  direction: z.enum(['add', 'remove']),
});

export type CreateAdjustmentReasonInput = z.infer<typeof createAdjustmentReasonSchema>;

export interface AdjustmentReason {
  id: string;
  name: string;
  direction: 'add' | 'remove';
  is_active: boolean;
  created_at: string;
}

export interface Adjustment {
  id: string;
  adjustment_number: string;
  location_id: string;
  commodity_id: string;
  unit_id: string;
  reason_id: string;
  quantity: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface AdjustmentWithRelations extends Adjustment {
  location: { name: string } | null;
  commodity: { name: string; code: string } | null;
  unit: { name: string; abbreviation: string } | null;
  reason: { name: string; direction: 'add' | 'remove' } | null;
}
