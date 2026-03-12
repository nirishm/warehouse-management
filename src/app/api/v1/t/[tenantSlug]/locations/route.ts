import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listLocations, createLocation } from '@/modules/inventory/queries/locations';
import { createLocationSchema } from '@/modules/inventory/validations/location';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        search: searchParams.get('search') ?? undefined,
        type: searchParams.get('type') ?? undefined,
        isActive: searchParams.has('isActive')
          ? searchParams.get('isActive') === 'true'
          : undefined,
      };

      const { data, total } = await listLocations(ctx.tenantId, filters, pagination);

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
      const parsed = createLocationSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const location = await createLocation(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: location }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:write' },
);
