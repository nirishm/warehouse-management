import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import {
  listCustomFields,
  createCustomField,
} from '@/modules/inventory/queries/custom-fields';
import { createCustomFieldSchema } from '@/modules/inventory/validations/custom-field';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        entityType: searchParams.get('entityType') ?? undefined,
      };

      const { data, total } = await listCustomFields(
        ctx.tenantId,
        filters,
        pagination,
      );

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
      const parsed = createCustomFieldSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const field = await createCustomField(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: field }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'settings:manage' },
);
