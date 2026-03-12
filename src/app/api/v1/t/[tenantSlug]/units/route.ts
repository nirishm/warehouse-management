import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listUnits, createUnit } from '@/modules/inventory/queries/units';
import { createUnitSchema } from '@/modules/inventory/validations/unit';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        search: searchParams.get('search') ?? undefined,
        type: searchParams.get('type') ?? undefined,
      };

      const { data, total } = await listUnits(ctx.tenantId, filters, pagination);

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
      const parsed = createUnitSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const unit = await createUnit(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: unit }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:write' },
);
