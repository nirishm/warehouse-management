import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { getPayment, softDeletePayment } from '@/modules/payments/queries/payments';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const payment = await getPayment(ctx.tenantId, id);
      if (!payment) {
        throw new ApiError(404, 'Payment not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: payment });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'payments:manage' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const payment = await softDeletePayment(ctx.tenantId, id, ctx.userId);
      if (!payment) {
        throw new ApiError(404, 'Payment not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: payment });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'payments:manage' },
);
