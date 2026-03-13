import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listPurchases, createPurchase } from '@/modules/purchase/queries/purchases';
import { createPurchaseSchema } from '@/modules/purchase/validations/purchase';
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
        contactId: searchParams.get('contactId') ?? undefined,
      };

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const { data, total } = await listPurchases(ctx.tenantId, { ...filters, locationScope }, pagination);

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
  { permission: 'orders:create' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = createPurchaseSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const purchase = await createPurchase(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: purchase }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:create' },
);
