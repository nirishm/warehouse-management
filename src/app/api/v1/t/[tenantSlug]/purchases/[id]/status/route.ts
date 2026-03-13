import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { getPurchase, updatePurchaseStatus } from '@/modules/purchase/queries/purchases';
import { updatePurchaseStatusSchema } from '@/modules/purchase/validations/purchase';
import { getUserLocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // URL: /api/v1/t/slug/purchases/UUID/status
  return segments[segments.length - 2];
}

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updatePurchaseStatusSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const existing = await getPurchase(ctx.tenantId, id, locationScope);
      if (!existing) {
        throw new ApiError(404, 'Purchase not found', 'NOT_FOUND');
      }

      const purchase = await updatePurchaseStatus(
        ctx.tenantId,
        id,
        parsed.data.status,
        ctx.userId,
      );
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
