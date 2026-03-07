import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requirePermission, requireModule } from '@/core/auth/guards';
import { getStockLevels } from '@/modules/inventory/queries/stock';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    try {
      requireModule(ctx, 'inventory');
      requirePermission(ctx, 'canViewStock');

      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId') ?? undefined;
      const commodityId = searchParams.get('commodityId') ?? undefined;

      const stockLevels = await getStockLevels(ctx.schemaName, {
        locationId,
        commodityId,
      });

      return NextResponse.json({ data: stockLevels });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.startsWith('Missing permission') || message.startsWith('Module not enabled')) {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
