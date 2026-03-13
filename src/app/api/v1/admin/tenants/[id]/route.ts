import { NextResponse } from 'next/server';
import { withAdminContext } from '@/core/auth/admin-guard';
import { db } from '@/core/db/drizzle';
import { tenants, userTenants } from '@/core/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional(),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  enabledModules: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withAdminContext(async (req) => {
  const id = req.url.split('/tenants/')[1]?.split('/')[0]?.split('?')[0];
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const result = await db.select().from(tenants).where(eq(tenants.id, id));
  if (result.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get user count for this tenant
  const userCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(userTenants)
    .where(eq(userTenants.tenantId, id));

  return NextResponse.json({ ...result[0], userCount: Number(userCount[0]?.count ?? 0) });
});

export const PATCH = withAdminContext(async (req) => {
  const id = req.url.split('/tenants/')[1]?.split('/')[0]?.split('?')[0];
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const parsed = updateTenantSchema.parse(body);

  // Build the set data, handling jsonb serialization for enabledModules.
  // postgres.js binds JS arrays as Postgres native arrays, not JSON.
  // Explicit JSON.stringify + ::jsonb cast fixes "malformed array literal".
  const setData: Record<string, unknown> = { ...parsed, updatedAt: new Date() };
  if (parsed.enabledModules) {
    setData.enabledModules = sql`${JSON.stringify(parsed.enabledModules)}::jsonb`;
  }

  const result = await db
    .update(tenants)
    .set(setData)
    .where(eq(tenants.id, id))
    .returning();

  if (result.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(result[0]);
});
