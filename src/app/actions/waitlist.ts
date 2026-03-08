'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const emailSchema = z.string().email('Please enter a valid email address.');

type WaitlistResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function joinWaitlist(email: string): Promise<WaitlistResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('waitlist').insert({ email: parsed.data });

  if (error) {
    // PostgreSQL unique violation = already on list
    if (error.code === '23505') {
      return { success: true, message: "You're already on the list." };
    }
    console.error('Waitlist insert error:', error);
    return { success: false, message: 'Something went wrong. Please try again.' };
  }

  return { success: true, message: "You're on the list. We'll be in touch soon." };
}
