import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { getSale, updateSale, softDeleteSale } from '@/modules/sale/queries/sales';
import { updateSaleSchema } from '@/modules/sale/validations/sale';
import { getUserLocationScope, assertLocationAccess } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const sale = await getSale(ctx.tenantId, id, locationScope);
      if (!sale) {
        throw new ApiError(404, 'Sale not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: sale });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'orders:create' },
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

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const existingSale = await getSale(ctx.tenantId, id, locationScope);
      if (!existingSale) {
        throw new ApiError(404, 'Sale not found', 'NOT_FOUND');
      }

      // Validate new locationId if being changed
      if (parsed.data.locationId !== undefined) {
        assertLocationAccess(locationScope, parsed.data.locationId);
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
      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const existingSale = await getSale(ctx.tenantId, id, locationScope);
      if (!existingSale) {
        throw new ApiError(404, 'Sale not found', 'NOT_FOUND');
      }

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
