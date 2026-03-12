import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { getStockAlerts } from '@/modules/stock-alerts/queries/stock-alerts';

export const GET = withTenantContext(
  async (_req: NextRequest, ctx) => {
    try {
      const alerts = await getStockAlerts(ctx.tenantId);
      return NextResponse.json({ data: alerts });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);
