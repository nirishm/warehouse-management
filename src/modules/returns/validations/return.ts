import { z } from 'zod';

export const createReturnItemSchema = z.object({
  commodity_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  quantity: z.number().positive(),
  lot_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createReturnSchema = z.object({
  return_type: z.enum(['purchase_return', 'sale_return']),
  original_txn_id: z.string().uuid(),
  location_id: z.string().uuid(),
  contact_id: z.string().uuid().optional().nullable(),
  return_date: z.string().datetime().optional(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(createReturnItemSchema).min(1),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type CreateReturnItemInput = z.infer<typeof createReturnItemSchema>;

export type ReturnStatus = 'draft' | 'confirmed' | 'cancelled';
export type ReturnType = 'purchase_return' | 'sale_return';

export interface ReturnItem {
  id: string;
  return_id: string;
  commodity_id: string;
  unit_id: string;
  quantity: number;
  lot_id: string | null;
  notes: string | null;
}

export interface Return {
  id: string;
  return_number: string;
  return_type: ReturnType;
  original_txn_id: string;
  location_id: string;
  contact_id: string | null;
  return_date: string;
  reason: string | null;
  status: ReturnStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReturnWithItems extends Return {
  items: (ReturnItem & {
    commodity: { id: string; name: string; code: string } | null;
    unit: { id: string; name: string; abbreviation: string | null } | null;
  })[];
  location: { id: string; name: string; code: string } | null;
  contact: { id: string; name: string } | null;
}
