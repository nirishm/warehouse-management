import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  getAdjustment,
  updateAdjustment,
  softDeleteAdjustment,
} from '@/modules/adjustments/queries/adjustments';
import { updateAdjustmentSchema } from '@/modules/adjustments/validations/adjustment';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const adjustment = await getAdjustment(ctx.tenantId, id);
      if (!adjustment) {
        throw new ApiError(404, 'Adjustment not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: adjustment });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'adjustments:create' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateAdjustmentSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const adjustment = await updateAdjustment(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!adjustment) {
        throw new ApiError(404, 'Adjustment not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: adjustment });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'adjustments:create' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const adjustment = await softDeleteAdjustment(ctx.tenantId, id, ctx.userId);
      if (!adjustment) {
        throw new ApiError(404, 'Adjustment not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: adjustment });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'adjustments:create' },
);
