import { NextRequest, NextResponse } from 'next/server';
import {
  withTenantContext,
  requireModule,
  requirePermission,
} from '@/core/auth/guards';
import {
  getOverviewStats,
  getDispatchAnalytics,
  getMovementSummary,
} from '@/modules/analytics/queries/analytics';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'analytics');
    requirePermission(ctx, 'canViewAnalytics');

    const [overview, dispatches, movements] = await Promise.all([
      getOverviewStats(ctx.schemaName),
      getDispatchAnalytics(ctx.schemaName),
      getMovementSummary(ctx.schemaName),
    ]);

    return NextResponse.json({
      data: { overview, dispatches, movements },
    });
  });
}
