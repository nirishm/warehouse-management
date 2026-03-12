import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { updateTransferStatus } from '@/modules/transfer/queries/transfers';
import { updateTransferStatusSchema } from '@/modules/transfer/validations/transfer';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // URL: /api/v1/t/slug/transfers/UUID/status
  return segments[segments.length - 2];
}

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateTransferStatusSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const transfer = await updateTransferStatus(
        ctx.tenantId,
        id,
        parsed.data.status,
        ctx.userId,
      );
      if (!transfer) {
        throw new ApiError(404, 'Transfer not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: transfer });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:update' },
);
