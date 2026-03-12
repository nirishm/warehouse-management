import { NextRequest, NextResponse } from 'next/server';
import { withAdminContext } from '@/core/auth/admin-guard';
import { db } from '@/core/db/drizzle';
import { accessRequests, userTenants } from '@/core/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const reviewSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  tenantId: z.string().uuid().optional(),
  role: z.enum(['owner', 'admin', 'manager', 'operator', 'viewer']).optional(),
});

export const GET = withAdminContext(async (req) => {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'pending';

  const data = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.status, status as 'pending' | 'approved' | 'rejected'))
    .orderBy(desc(accessRequests.createdAt));

  return NextResponse.json({ data });
});

export const PATCH = withAdminContext(async (req, ctx) => {
  const body = await req.json();
  const parsed = reviewSchema.parse(body);

  if (parsed.action === 'approve') {
    if (!parsed.tenantId) {
      return NextResponse.json({ error: 'tenantId required for approval' }, { status: 400 });
    }

    // Get the access request
    const request = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, parsed.requestId));
    if (request.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const ar = request[0];

    // Create user_tenants membership
    await db.insert(userTenants).values({
      userId: ar.userId,
      tenantId: parsed.tenantId,
      role: parsed.role ?? 'viewer',
      isDefault: true,
    });

    // Update request status
    await db
      .update(accessRequests)
      .set({ status: 'approved', reviewedBy: ctx.userId, reviewedAt: new Date() })
      .where(eq(accessRequests.id, parsed.requestId));
  } else {
    await db
      .update(accessRequests)
      .set({ status: 'rejected', reviewedBy: ctx.userId, reviewedAt: new Date() })
      .where(eq(accessRequests.id, parsed.requestId));
  }

  return NextResponse.json({ success: true });
});
