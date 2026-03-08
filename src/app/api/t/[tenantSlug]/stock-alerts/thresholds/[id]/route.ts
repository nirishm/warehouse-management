import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { upsertThreshold, deleteThreshold } from '@/modules/stock-alerts/queries/alerts';
import { upsertThresholdSchema } from '@/modules/stock-alerts/validations/threshold';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Props) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'stock-alerts');
    requirePermission(ctx, 'canManageAlerts');

    const { id } = await params;
    const body = await request.json();
    const parsed = upsertThresholdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const threshold = await upsertThreshold(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: threshold });
  });
}

export async function DELETE(request: NextRequest, { params }: Props) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'stock-alerts');
    requirePermission(ctx, 'canManageAlerts');

    const { id } = await params;
    await deleteThreshold(ctx.schemaName, id);
    return NextResponse.json({ success: true });
  });
}
