import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listThresholds, upsertThreshold } from '@/modules/stock-alerts/queries/alerts';
import { upsertThresholdSchema } from '@/modules/stock-alerts/validations/threshold';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'stock-alerts');

    const thresholds = await listThresholds(ctx.schemaName);
    return NextResponse.json({ data: thresholds });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'stock-alerts');
    requirePermission(ctx, 'canManageAlerts');

    const body = await request.json();
    const parsed = upsertThresholdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const threshold = await upsertThreshold(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: threshold }, { status: 201 });
  });
}
