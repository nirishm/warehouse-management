import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule } from '@/core/auth/guards';
import { getStockAlerts } from '@/modules/stock-alerts/queries/alerts';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'stock-alerts');

    const alerts = await getStockAlerts(ctx.schemaName);
    return NextResponse.json({ data: alerts });
  });
}
