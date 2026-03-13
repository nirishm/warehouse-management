import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { getDashboardAnalytics } from '@/modules/analytics/queries/analytics';
import type { Period } from '@/modules/analytics/queries/analytics';
import { getUserLocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);

      const from = searchParams.get('from') ?? undefined;
      const to = searchParams.get('to') ?? undefined;

      const period: Period | undefined =
        from !== undefined || to !== undefined ? { from, to } : undefined;

      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const data = await getDashboardAnalytics(ctx.tenantId, period, locationScope);

      return NextResponse.json({ data });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);
