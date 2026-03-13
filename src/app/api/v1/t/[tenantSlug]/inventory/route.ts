import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { getStockLevels } from '@/modules/inventory/queries/stock';
import { getUserLocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const filters = {
        itemId: searchParams.get('itemId') ?? undefined,
        locationId: searchParams.get('locationId') ?? undefined,
      };

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const data = await getStockLevels(ctx.tenantId, { ...filters, locationScope });

      return NextResponse.json({ data });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);
