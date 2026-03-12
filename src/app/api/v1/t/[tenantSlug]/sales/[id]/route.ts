import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { getSale, updateSale, softDeleteSale } from '@/modules/sale/queries/sales';
import { updateSaleSchema } from '@/modules/sale/validations/sale';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const sale = await getSale(ctx.tenantId, id);
      if (!sale) {
        throw new ApiError(404, 'Sale not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: sale });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateSaleSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const sale = await updateSale(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!sale) {
        throw new ApiError(404, 'Sale not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: sale });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:update' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const sale = await softDeleteSale(ctx.tenantId, id, ctx.userId);
      if (!sale) {
        throw new ApiError(404, 'Sale not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: sale });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:delete' },
);
