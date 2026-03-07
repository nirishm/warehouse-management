import { z } from 'zod';

export const createPaymentSchema = z.object({
  transaction_type: z.enum(['purchase', 'sale']),
  transaction_id: z.string().uuid(),
  contact_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  payment_date: z.string().datetime().optional(),
  payment_method: z.enum(['cash', 'bank_transfer', 'cheque', 'upi', 'other']).default('cash'),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export interface Payment {
  id: string;
  payment_number: string;
  transaction_type: 'purchase' | 'sale';
  transaction_id: string;
  contact_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TransactionBalance {
  transaction_id: string;
  transaction_type: 'purchase' | 'sale';
  total_value: number;
  total_paid: number;
  outstanding: number;
}
