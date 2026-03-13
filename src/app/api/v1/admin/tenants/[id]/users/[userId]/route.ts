import { NextResponse } from 'next/server';
import { withAdminContext } from '@/core/auth/admin-guard';
import { z } from 'zod';
import { updateUserRole, removeUser } from '@/modules/user-management/queries/users';
import { syncUserAppMetadata } from '@/core/auth/sync-metadata';
import type { Role } from '@/core/auth/types';

function extractIds(url: string): { tenantId: string; userId: string } {
  const segments = new URL(url).pathname.split('/');
  // URL: /api/v1/admin/tenants/{tenantId}/users/{userId}
  // idx:  0  1  2   3      4       5        6      7
  const tenantId = segments[5] ?? '';
  const userId = segments[7] ?? '';
  return { tenantId, userId };
}

const roleSchema = z.object({
  role: z.enum(['admin', 'manager', 'operator', 'viewer']),
});

export const PATCH = withAdminContext(async (req, ctx) => {
  const { tenantId, userId } = extractIds(req.url);
  if (!tenantId || !userId) return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });

  const body = await req.json();
  const parsed = roleSchema.parse(body);

  const result = await updateUserRole(tenantId, userId, parsed.role as Exclude<Role, 'owner'>, ctx.userId);
  await syncUserAppMetadata(userId);

  return NextResponse.json({ data: result });
});

export const DELETE = withAdminContext(async (req, ctx) => {
  const { tenantId, userId } = extractIds(req.url);
  if (!tenantId || !userId) return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });

  await removeUser(tenantId, userId, ctx.userId);

  return NextResponse.json({ data: { success: true } });
});
