import { z } from 'zod';

const dispatchItemSchema = z.object({
  commodity_id: z.string().uuid('Invalid commodity'),
  unit_id: z.string().uuid('Invalid unit'),
  sent_quantity: z.number().positive('Quantity must be greater than 0'),
  sent_bags: z.number().int().nonnegative().optional(),
});

export const createDispatchSchema = z
  .object({
    origin_location_id: z.string().uuid('Invalid origin location'),
    dest_location_id: z.string().uuid('Invalid destination location'),
    transporter_name: z.string().optional(),
    vehicle_number: z.string().optional(),
    driver_name: z.string().optional(),
    driver_phone: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(dispatchItemSchema).min(1, 'At least one item is required'),
  })
  .refine((data) => data.origin_location_id !== data.dest_location_id, {
    message: 'Origin and destination must be different',
    path: ['dest_location_id'],
  });

export const updateDispatchSchema = z
  .object({
    origin_location_id: z.string().uuid('Invalid origin location').optional(),
    dest_location_id: z.string().uuid('Invalid destination location').optional(),
    transporter_name: z.string().optional(),
    vehicle_number: z.string().optional(),
    driver_name: z.string().optional(),
    driver_phone: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(dispatchItemSchema).min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.origin_location_id && data.dest_location_id) {
        return data.origin_location_id !== data.dest_location_id;
      }
      return true;
    },
    {
      message: 'Origin and destination must be different',
      path: ['dest_location_id'],
    }
  );

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;
export type UpdateDispatchInput = z.infer<typeof updateDispatchSchema>;
export type DispatchItemInput = z.infer<typeof dispatchItemSchema>;

export type DispatchStatus = 'draft' | 'dispatched' | 'in_transit' | 'received' | 'cancelled';

export interface Dispatch {
  id: string;
  dispatch_number: string;
  origin_location_id: string;
  dest_location_id: string;
  status: DispatchStatus;
  dispatched_at: string | null;
  received_at: string | null;
  dispatched_by: string | null;
  received_by: string | null;
  transporter_name: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DispatchWithLocations extends Dispatch {
  origin_location: { name: string } | null;
  dest_location: { name: string } | null;
  item_count?: number;
}

export interface DispatchItem {
  id: string;
  dispatch_id: string;
  commodity_id: string;
  unit_id: string;
  sent_quantity: number;
  sent_bags: number | null;
  received_quantity: number | null;
  received_bags: number | null;
  shortage: number | null;
  shortage_percent: number | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

export interface DispatchItemWithNames extends DispatchItem {
  commodity: { name: string; code: string } | null;
  unit: { name: string; abbreviation: string } | null;
}
