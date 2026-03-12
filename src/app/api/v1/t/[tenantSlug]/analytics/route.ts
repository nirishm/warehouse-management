import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { getDashboardAnalytics } from '@/modules/analytics/queries/analytics';
import type { Period } from '@/modules/analytics/queries/analytics';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);

      const from = searchParams.get('from') ?? undefined;
      const to = searchParams.get('to') ?? undefined;

      const period: Period | undefined =
        from !== undefined || to !== undefined ? { from, to } : undefined;

      const data = await getDashboardAnalytics(ctx.tenantId, period);

      return NextResponse.json({ data });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'reports:read' },
);
