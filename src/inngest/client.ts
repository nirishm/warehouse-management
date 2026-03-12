import { Inngest } from 'inngest';
import type { AppEvents } from '@/core/events/types';

export const inngest = new Inngest({ id: 'wareos' });

export type InngestClient = typeof inngest;

// Re-export for convenience in function definitions
export type { AppEvents };
