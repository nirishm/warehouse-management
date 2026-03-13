import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { getStockAlerts } from '@/modules/stock-alerts/queries/stock-alerts';
import { getUserLocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

export const GET = withTenantContext(
  async (_req: NextRequest, ctx) => {
    try {
      const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
      const alerts = await getStockAlerts(ctx.tenantId, locationScope);
      return NextResponse.json({ data: alerts });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);
