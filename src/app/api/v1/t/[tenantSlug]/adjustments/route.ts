import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listAdjustments, createAdjustment } from '@/modules/adjustments/queries/adjustments';
import { createAdjustmentSchema } from '@/modules/adjustments/validations/adjustment';
import { getUserLocationScope, assertLocationAccess } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        search: searchParams.get('search') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        locationId: searchParams.get('locationId') ?? undefined,
        type: searchParams.get('type') ?? undefined,
      };

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const { data, total } = await listAdjustments(ctx.tenantId, { ...filters, locationScope }, pagination);

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
  { permission: 'adjustments:create' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = createAdjustmentSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      assertLocationAccess(locationScope, parsed.data.locationId);

      const adjustment = await createAdjustment(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: adjustment }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'adjustments:create' },
);
