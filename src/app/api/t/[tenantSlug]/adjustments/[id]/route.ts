import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getAdjustmentById } from '@/modules/adjustments/queries/adjustments';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'adjustments');
    requirePermission(ctx, 'canManageAdjustments');

    const adjustment = await getAdjustmentById(ctx.schemaName, id);
    if (!adjustment) {
      return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 });
    }
    if (
      ctx.allowedLocationIds !== null &&
      !ctx.allowedLocationIds.includes(adjustment.location_id)
    ) {
      return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 });
    }
    return NextResponse.json({ data: adjustment });
  });
}
