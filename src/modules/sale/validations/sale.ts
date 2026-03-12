import { z } from 'zod';

export const saleItemSchema = z.object({
  commodity_id: z.string().uuid('Invalid item'),
  unit_id: z.string().uuid('Invalid unit'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  bags: z.number().int().nonnegative().optional(),
  unit_price: z.number().nonnegative().optional(),
});

export const createSaleSchema = z.object({
  location_id: z.string().uuid('Location is required'),
  contact_id: z.string().uuid().optional().nullable(),
  transporter_name: z.string().optional().default(''),
  vehicle_number: z.string().optional().default(''),
  driver_name: z.string().optional().default(''),
  driver_phone: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  items: z
    .array(saleItemSchema)
    .min(1, 'At least one item is required'),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;

export type SaleStatus = 'draft' | 'confirmed' | 'dispatched' | 'cancelled';

export interface SaleItem {
  id: string;
  sale_id: string;
  commodity_id: string;
  unit_id: string;
  quantity: number;
  bags: number | null;
  unit_price: number | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  commodity?: { id: string; name: string; code: string };
  unit?: { id: string; name: string; abbreviation: string };
}

export interface Sale {
  id: string;
  sale_number: string;
  contact_id: string | null;
  location_id: string;
  status: SaleStatus;
  sold_at: string;
  created_by: string;
  transporter_name: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  location?: { id: string; name: string; code: string };
  contact?: { id: string; name: string } | null;
  items?: SaleItem[];
}
