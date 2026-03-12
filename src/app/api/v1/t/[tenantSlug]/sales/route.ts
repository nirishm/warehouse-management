import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listSales, createSale } from '@/modules/sale/queries/sales';
import { createSaleSchema } from '@/modules/sale/validations/sale';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        search: searchParams.get('search') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        contactId: searchParams.get('contactId') ?? undefined,
      };

      const { data, total } = await listSales(ctx.tenantId, filters, pagination);

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
  { permission: 'inventory:read' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = createSaleSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const sale = await createSale(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: sale }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:create' },
);
