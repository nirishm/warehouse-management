import { z } from 'zod';

export const createLotSchema = z.object({
  lot_number: z.string().min(1).optional(), // auto-generated if omitted
  commodity_id: z.string().uuid(),
  source_purchase_id: z.string().uuid().optional().nullable(),
  received_date: z.string().datetime().optional(),
  expiry_date: z.string().datetime().optional().nullable(),
  initial_quantity: z.number().positive(),
  unit_id: z.string().uuid(),
  notes: z.string().optional().nullable(),
});

export type CreateLotInput = z.infer<typeof createLotSchema>;

export interface Lot {
  id: string;
  lot_number: string;
  commodity_id: string;
  source_purchase_id: string | null;
  received_date: string;
  expiry_date: string | null;
  initial_quantity: number;
  unit_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LotWithDetails extends Lot {
  commodity: { id: string; name: string; code: string } | null;
  unit: { id: string; name: string; abbreviation: string | null } | null;
  current_quantity: number;
}

export interface LotStockLevel {
  lot_id: string;
  lot_number: string;
  commodity_id: string;
  unit_id: string;
  received_date: string;
  expiry_date: string | null;
  initial_quantity: number;
  current_quantity: number;
}

export interface LotMovement {
  id: string;
  movement_type: 'dispatch' | 'sale';
  reference_number: string;
  quantity: number;
  movement_date: string;
}
