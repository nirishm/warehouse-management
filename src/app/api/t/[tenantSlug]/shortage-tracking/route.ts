import { NextRequest, NextResponse } from 'next/server';
import {
  withTenantContext,
  requireModule,
  requirePermission,
} from '@/core/auth/guards';
import {
  getShortageOverview,
  getShortageByRoute,
  getShortageByTransporter,
  getShortageByCommodity,
  getRecentShortages,
} from '@/modules/shortage-tracking/queries/shortages';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'shortage-tracking');
    requirePermission(ctx, 'canViewAnalytics');

    const [overview, byRoute, byTransporter, byCommodity, recent] =
      await Promise.all([
        getShortageOverview(ctx.schemaName),
        getShortageByRoute(ctx.schemaName),
        getShortageByTransporter(ctx.schemaName),
        getShortageByCommodity(ctx.schemaName),
        getRecentShortages(ctx.schemaName),
      ]);

    return NextResponse.json({
      data: { overview, byRoute, byTransporter, byCommodity, recent },
    });
  });
}
