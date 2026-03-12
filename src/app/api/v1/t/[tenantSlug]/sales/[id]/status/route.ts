import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { updateSaleStatus } from '@/modules/sale/queries/sales';
import { updateSaleStatusSchema } from '@/modules/sale/validations/sale';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // URL: /api/v1/t/slug/sales/UUID/status
  return segments[segments.length - 2];
}

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateSaleStatusSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const sale = await updateSaleStatus(ctx.tenantId, id, parsed.data.status, ctx.userId);
      if (!sale) {
        throw new ApiError(404, 'Sale not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: sale });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:update' },
);
