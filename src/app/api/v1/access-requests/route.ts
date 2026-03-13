import { NextResponse } from 'next/server';
import { db } from '@/core/db/drizzle';
import { accessRequests } from '@/core/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createRequestSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createRequestSchema.parse(body);

    // Check for existing pending request (idempotent)
    const existing = await db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.userId, parsed.userId),
          eq(accessRequests.status, 'pending'),
        ),
      );

    if (existing.length > 0) {
      return NextResponse.json(existing[0], { status: 200 });
    }

    // Create new access request
    const result = await db
      .insert(accessRequests)
      .values({
        userId: parsed.userId,
        email: parsed.email,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    console.error('[access-requests] POST failed:', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
