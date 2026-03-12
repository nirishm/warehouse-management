import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { getPaymentSummary } from '@/modules/payments/queries/payments';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const typeParam = searchParams.get('type');
      const referenceId = searchParams.get('referenceId');

      if (typeParam !== 'purchase' && typeParam !== 'sale') {
        throw new ApiError(
          400,
          "Query param 'type' must be 'purchase' or 'sale'",
          'VALIDATION_ERROR',
        );
      }
      if (!referenceId) {
        throw new ApiError(400, "Query param 'referenceId' is required", 'VALIDATION_ERROR');
      }

      const summary = await getPaymentSummary(
        ctx.tenantId,
        typeParam as 'purchase' | 'sale',
        referenceId,
      );

      return NextResponse.json({ data: summary });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'payments:manage' },
);
