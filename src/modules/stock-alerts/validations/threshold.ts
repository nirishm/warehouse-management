import { z } from 'zod';

export const upsertThresholdSchema = z.object({
  commodity_id: z.string().uuid(),
  location_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  min_stock: z.number().min(0),
  reorder_point: z.number().min(0),
  is_active: z.boolean().optional().default(true),
});

export type UpsertThresholdInput = z.infer<typeof upsertThresholdSchema>;

export interface StockAlertThreshold {
  id: string;
  commodity_id: string;
  location_id: string;
  unit_id: string;
  min_stock: number;
  reorder_point: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type AlertState = 'OK' | 'WARNING' | 'CRITICAL';

export interface StockAlert {
  commodity_id: string;
  commodity_name: string;
  commodity_code: string;
  location_id: string;
  location_name: string;
  unit_id: string;
  unit_abbreviation: string;
  current_stock: number;
  min_stock: number;
  reorder_point: number;
  alert_state: AlertState;
  threshold_id: string;
}

export interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  ok: number;
}
