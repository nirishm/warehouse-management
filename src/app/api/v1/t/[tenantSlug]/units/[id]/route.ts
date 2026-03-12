import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { getUnit, updateUnit, softDeleteUnit } from '@/modules/inventory/queries/units';
import { updateUnitSchema } from '@/modules/inventory/validations/unit';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const unit = await getUnit(ctx.tenantId, id);
      if (!unit) {
        throw new ApiError(404, 'Unit not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: unit });
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
      const parsed = updateUnitSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const unit = await updateUnit(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!unit) {
        throw new ApiError(404, 'Unit not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: unit });
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
      const unit = await softDeleteUnit(ctx.tenantId, id, ctx.userId);
      if (!unit) {
        throw new ApiError(404, 'Unit not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: unit });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:write' },
);
