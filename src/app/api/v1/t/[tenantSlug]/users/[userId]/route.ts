import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  getUser,
  updateUserRole,
  removeUser,
} from '@/modules/user-management/queries/users';
import { updateUserRoleSchema } from '@/modules/user-management/validations/user';
import type { Role } from '@/core/auth/types';

function extractUserId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // Path: /api/v1/t/[tenantSlug]/users/[userId]
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const userId = extractUserId(req);
      const user = await getUser(ctx.tenantId, userId);
      if (!user) {
        throw new ApiError(404, 'User not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: user });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'users:manage' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const userId = extractUserId(req);
      const body = await req.json();
      const parsed = updateUserRoleSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const membership = await updateUserRole(
        ctx.tenantId,
        userId,
        parsed.data.role as Exclude<Role, 'owner'>,
        ctx.userId,
      );

      return NextResponse.json({ data: membership });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'users:manage' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const userId = extractUserId(req);
      await removeUser(ctx.tenantId, userId, ctx.userId);
      return NextResponse.json({ data: { success: true } });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'users:manage' },
);
