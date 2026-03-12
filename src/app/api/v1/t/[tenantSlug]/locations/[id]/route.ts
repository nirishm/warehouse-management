import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  getLocation,
  updateLocation,
  softDeleteLocation,
} from '@/modules/inventory/queries/locations';
import { updateLocationSchema } from '@/modules/inventory/validations/location';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const location = await getLocation(ctx.tenantId, id);
      if (!location) {
        throw new ApiError(404, 'Location not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: location });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateLocationSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const location = await updateLocation(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!location) {
        throw new ApiError(404, 'Location not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: location });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:write' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const location = await softDeleteLocation(ctx.tenantId, id, ctx.userId);
      if (!location) {
        throw new ApiError(404, 'Location not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: location });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:write' },
);
