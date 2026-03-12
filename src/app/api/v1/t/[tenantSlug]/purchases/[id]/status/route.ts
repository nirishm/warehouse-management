import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { updatePurchaseStatus } from '@/modules/purchase/queries/purchases';
import { updatePurchaseStatusSchema } from '@/modules/purchase/validations/purchase';

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
