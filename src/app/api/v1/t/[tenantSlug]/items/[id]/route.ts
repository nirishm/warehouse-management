import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { getItem, updateItem, softDeleteItem } from '@/modules/inventory/queries/items';
import { updateItemSchema } from '@/modules/inventory/validations/item';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const item = await getItem(ctx.tenantId, id);
      if (!item) {
        throw new ApiError(404, 'Item not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: item });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'items:read' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateItemSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const item = await updateItem(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!item) {
        throw new ApiError(404, 'Item not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: item });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'items:write' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const item = await softDeleteItem(ctx.tenantId, id, ctx.userId);
      if (!item) {
        throw new ApiError(404, 'Item not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: item });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'items:delete' },
);
