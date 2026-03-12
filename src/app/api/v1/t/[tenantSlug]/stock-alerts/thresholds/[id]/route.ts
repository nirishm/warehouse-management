import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  updateAlertThreshold,
  deleteAlertThreshold,
} from '@/modules/stock-alerts/queries/alert-thresholds';
import { updateAlertThresholdSchema } from '@/modules/stock-alerts/validations/alert-threshold';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateAlertThresholdSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const threshold = await updateAlertThreshold(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!threshold) {
        throw new ApiError(404, 'Alert threshold not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: threshold });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'settings:manage' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const threshold = await deleteAlertThreshold(ctx.tenantId, id, ctx.userId);
      if (!threshold) {
        throw new ApiError(404, 'Alert threshold not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: threshold });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'settings:manage' },
);
