import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { getStockLevels } from '@/modules/inventory/queries/stock';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const filters = {
        itemId: searchParams.get('itemId') ?? undefined,
        locationId: searchParams.get('locationId') ?? undefined,
      };

      const data = await getStockLevels(ctx.tenantId, filters);

      return NextResponse.json({ data });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);
