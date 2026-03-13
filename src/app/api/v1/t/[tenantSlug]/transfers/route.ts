import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listTransfers, createTransfer } from '@/modules/transfer/queries/transfers';
import { createTransferSchema } from '@/modules/transfer/validations/transfer';
import { getUserLocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        search: searchParams.get('search') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        originLocationId: searchParams.get('originLocationId') ?? undefined,
        destLocationId: searchParams.get('destLocationId') ?? undefined,
      };

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const { data, total } = await listTransfers(ctx.tenantId, { ...filters, locationScope }, pagination);

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
  { permission: 'transfers:create' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = createTransferSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const transfer = await createTransfer(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: transfer }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'transfers:create' },
);
