import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { updateUserPermissions } from '@/modules/user-management/queries/users';
import { updateUserPermissionsSchema } from '@/modules/user-management/validations/user';

function extractUserId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // Path: /api/v1/t/[tenantSlug]/users/[userId]/permissions
  // userId is two segments from the end
  return segments[segments.length - 2];
}

export const PUT = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const userId = extractUserId(req);
      const body = await req.json();
      const parsed = updateUserPermissionsSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const profile = await updateUserPermissions(
        ctx.tenantId,
        userId,
        parsed.data.permissions,
        ctx.userId,
      );

      return NextResponse.json({ data: profile });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'users:manage' },
);
