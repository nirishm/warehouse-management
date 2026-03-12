import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { approveAdjustment } from '@/modules/adjustments/queries/adjustments';
import { approveAdjustmentSchema } from '@/modules/adjustments/validations/adjustment';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // URL: /api/v1/t/slug/adjustments/UUID/approve
  return segments[segments.length - 2];
}

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = approveAdjustmentSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const adjustment = await approveAdjustment(ctx.tenantId, id, ctx.userId);
      if (!adjustment) {
        throw new ApiError(404, 'Adjustment not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: adjustment });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'adjustments:approve' },
);
