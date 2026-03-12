import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { updateUserLocations } from '@/modules/user-management/queries/users';
import { updateUserLocationsSchema } from '@/modules/user-management/validations/user';

function extractUserId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // Path: /api/v1/t/[tenantSlug]/users/[userId]/locations
  // userId is two segments from the end
  return segments[segments.length - 2];
}

export const PUT = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const userId = extractUserId(req);
      const body = await req.json();
      const parsed = updateUserLocationsSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const locations = await updateUserLocations(
        ctx.tenantId,
        userId,
        parsed.data.locationIds,
        ctx.userId,
      );

      return NextResponse.json({ data: locations });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'users:manage' },
);
