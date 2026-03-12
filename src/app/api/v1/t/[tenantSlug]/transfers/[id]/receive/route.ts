import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { receiveTransfer } from '@/modules/transfer/queries/transfers';
import { receiveTransferSchema } from '@/modules/transfer/validations/transfer';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // URL: /api/v1/t/slug/transfers/UUID/receive
  return segments[segments.length - 2];
}

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = receiveTransferSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const transfer = await receiveTransfer(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!transfer) {
        throw new ApiError(404, 'Transfer not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: transfer });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'transfers:receive' },
);
