import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requirePermission, requireModule } from '@/core/auth/guards';
import { getStockLevels } from '@/modules/inventory/queries/stock';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canViewStock');

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId') ?? undefined;
    const commodityId = searchParams.get('commodityId') ?? undefined;

    const stockLevels = await getStockLevels(ctx.schemaName, {
      locationId,
      commodityId,
      allowedLocationIds: ctx.allowedLocationIds,
    });

    return NextResponse.json({ data: stockLevels });
  });
}
