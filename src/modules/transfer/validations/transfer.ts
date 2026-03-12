import { z } from 'zod';

const transferItemSchema = z.object({
  itemId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  sentQty: z.string().min(1), // numeric string
});

const receiveItemSchema = z.object({
  id: z.string().uuid(), // transfer_item id
  receivedQty: z.string().min(1), // numeric string
});

export const createTransferSchema = z.object({
  originLocationId: z.string().uuid(),
  destLocationId: z.string().uuid(),
  notes: z.string().max(5000).optional(),
  items: z.array(transferItemSchema).min(1),
});

export const updateTransferSchema = z.object({
  originLocationId: z.string().uuid().optional(),
  destLocationId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  items: z.array(transferItemSchema).optional(),
});

export const updateTransferStatusSchema = z.object({
  status: z.enum(['draft', 'dispatched', 'in_transit', 'received']),
});

export const receiveTransferSchema = z.object({
  items: z.array(receiveItemSchema).min(1),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>;
