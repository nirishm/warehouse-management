import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listItems, createItem } from '@/modules/inventory/queries/items';
import { createItemSchema } from '@/modules/inventory/validations/item';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        search: searchParams.get('search') ?? undefined,
        category: searchParams.get('category') ?? undefined,
        type: searchParams.get('type') ?? undefined,
        isActive: searchParams.has('isActive')
          ? searchParams.get('isActive') === 'true'
          : undefined,
      };

      const { data, total } = await listItems(ctx.tenantId, filters, pagination);

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
  { permission: 'items:read' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = createItemSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const item = await createItem(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: item }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'items:write' },
);
