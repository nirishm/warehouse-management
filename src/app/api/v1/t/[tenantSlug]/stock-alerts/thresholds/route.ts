import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import {
  listAlertThresholds,
  createAlertThreshold,
} from '@/modules/stock-alerts/queries/alert-thresholds';
import { createAlertThresholdSchema } from '@/modules/stock-alerts/validations/alert-threshold';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        itemId: searchParams.get('itemId') ?? undefined,
        locationId: searchParams.get('locationId') ?? undefined,
      };

      const { data, total } = await listAlertThresholds(ctx.tenantId, filters, pagination);

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
  { permission: 'settings:manage' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = createAlertThresholdSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const threshold = await createAlertThreshold(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: threshold }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'settings:manage' },
);
