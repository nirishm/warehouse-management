import { NextResponse } from 'next/server';
import { withAdminContext } from '@/core/auth/admin-guard';
import { db } from '@/core/db/drizzle';
import { tenants } from '@/core/db/schema';
import { desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  enabledModules: z.array(z.string()).optional(),
});

export const GET = withAdminContext(async (req) => {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const [data, countResult] = await Promise.all([
    db.select().from(tenants).orderBy(desc(tenants.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(tenants),
  ]);

  return NextResponse.json({ data, total: Number(countResult[0]?.count ?? 0) });
});

export const POST = withAdminContext(async (req) => {
  const body = await req.json();
  const parsed = createTenantSchema.parse(body);

  const result = await db.insert(tenants).values({
    name: parsed.name,
    slug: parsed.slug,
    plan: parsed.plan ?? 'free',
    enabledModules: parsed.enabledModules ?? ['inventory'],
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
});
