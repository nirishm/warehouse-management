import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  getPurchase,
  updatePurchase,
  softDeletePurchase,
} from '@/modules/purchase/queries/purchases';
import { updatePurchaseSchema } from '@/modules/purchase/validations/purchase';
import { getUserLocationScope, assertLocationAccess } from '@/core/db/location-scope';
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
      const purchase = await getPurchase(ctx.tenantId, id, locationScope);
      if (!purchase) {
        throw new ApiError(404, 'Purchase not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: purchase });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:create' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updatePurchaseSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const existingPurchase = await getPurchase(ctx.tenantId, id, locationScope);
      if (!existingPurchase) {
        throw new ApiError(404, 'Purchase not found', 'NOT_FOUND');
      }

      const purchase = await updatePurchase(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!purchase) {
        throw new ApiError(404, 'Purchase not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: purchase });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:update' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const existingPurchase = await getPurchase(ctx.tenantId, id, locationScope);
      if (!existingPurchase) {
        throw new ApiError(404, 'Purchase not found', 'NOT_FOUND');
      }

      const purchase = await softDeletePurchase(ctx.tenantId, id, ctx.userId);
      if (!purchase) {
        throw new ApiError(404, 'Purchase not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: purchase });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:delete' },
);
