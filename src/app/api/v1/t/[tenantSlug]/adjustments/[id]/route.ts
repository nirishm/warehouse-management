import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  getAdjustment,
  updateAdjustment,
  softDeleteAdjustment,
} from '@/modules/adjustments/queries/adjustments';
import { updateAdjustmentSchema } from '@/modules/adjustments/validations/adjustment';
import { getUserLocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const adjustment = await getAdjustment(ctx.tenantId, id, locationScope);
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

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const existingAdjustment = await getAdjustment(ctx.tenantId, id, locationScope);
      if (!existingAdjustment) {
        throw new ApiError(404, 'Adjustment not found', 'NOT_FOUND');
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
      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const existingAdjustment = await getAdjustment(ctx.tenantId, id, locationScope);
      if (!existingAdjustment) {
        throw new ApiError(404, 'Adjustment not found', 'NOT_FOUND');
      }

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
