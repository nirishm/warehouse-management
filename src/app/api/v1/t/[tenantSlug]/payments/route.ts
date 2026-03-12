import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listPayments, createPayment } from '@/modules/payments/queries/payments';
import { createPaymentSchema } from '@/modules/payments/validations/payment';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const typeParam = searchParams.get('type');
      const filters = {
        type:
          typeParam === 'purchase' || typeParam === 'sale'
            ? (typeParam as 'purchase' | 'sale')
            : undefined,
        referenceId: searchParams.get('referenceId') ?? undefined,
      };

      const { data, total } = await listPayments(ctx.tenantId, filters, pagination);

      return NextResponse.json({
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'payments:manage' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = createPaymentSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const payment = await createPayment(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: payment }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'payments:manage' },
);
