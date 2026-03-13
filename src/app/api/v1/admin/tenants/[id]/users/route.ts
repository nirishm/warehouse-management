import { NextResponse } from 'next/server';
import { withAdminContext } from '@/core/auth/admin-guard';
import { db } from '@/core/db/drizzle';
import { tenants } from '@/core/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { inviteUser, listUsers } from '@/modules/user-management/queries/users';
import { createAdminClient } from '@/lib/supabase/admin';

function extractTenantId(url: string): string {
  return new URL(url).pathname.split('/tenants/')[1]?.split('/')[0] ?? '';
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']),
  displayName: z.string().optional(),
});

export const GET = withAdminContext(async (req) => {
  const tenantId = extractTenantId(req.url);
  if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });

  const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (rows.length === 0) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const members = await listUsers(tenantId, undefined, { limit: 100, offset: 0 });

  const admin = createAdminClient();
  const emailMap = new Map<string, string>();
  await Promise.all(
    members.data.map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.userId);
      if (data?.user?.email) emailMap.set(m.userId, data.user.email);
    }),
  );

  const data = members.data.map((m) => ({
    ...m,
    email: emailMap.get(m.userId) ?? null,
  }));

  return NextResponse.json({ data });
});

export const POST = withAdminContext(async (req, ctx) => {
  const tenantId = extractTenantId(req.url);
  if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });

  const body = await req.json();
  const parsed = inviteSchema.parse(body);

  const result = await inviteUser(
    tenantId,
    parsed.email,
    parsed.role,
    parsed.displayName,
    ctx.userId,
  );

  return NextResponse.json({ data: result }, { status: 201 });
});
