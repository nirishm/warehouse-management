import { z } from 'zod';

export const purchaseRowSchema = z.object({
  location_code: z.string().min(1, 'location_code is required'),
  commodity_code: z.string().min(1, 'commodity_code is required'),
  quantity: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'quantity must be a positive number'),
  unit_abbreviation: z.string().optional().default(''),
  bags: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export type PurchaseRow = z.infer<typeof purchaseRowSchema>;

export const PURCHASES_TEMPLATE_HEADERS = [
  'location_code', 'commodity_code', 'quantity', 'unit_abbreviation', 'bags', 'notes',
];
