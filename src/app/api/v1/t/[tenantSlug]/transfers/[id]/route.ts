import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  getTransfer,
  updateTransfer,
  softDeleteTransfer,
} from '@/modules/transfer/queries/transfers';
import { updateTransferSchema } from '@/modules/transfer/validations/transfer';
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
      const transfer = await getTransfer(ctx.tenantId, id, locationScope);
      if (!transfer) {
        throw new ApiError(404, 'Transfer not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: transfer });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'transfers:create' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateTransferSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const transfer = await updateTransfer(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!transfer) {
        throw new ApiError(404, 'Transfer not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: transfer });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'transfers:create' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const transfer = await softDeleteTransfer(ctx.tenantId, id, ctx.userId);
      if (!transfer) {
        throw new ApiError(404, 'Transfer not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: transfer });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'transfers:create' },
);
