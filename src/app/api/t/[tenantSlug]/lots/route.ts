import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listLots, createLot } from '@/modules/lot-tracking/queries/lots';
import { createLotSchema } from '@/modules/lot-tracking/validations/lot';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'lot-tracking');

    const lots = await listLots(ctx.schemaName);
    return NextResponse.json({ data: lots });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'lot-tracking');
    requirePermission(ctx, 'canManageLots');

    const body = await request.json();
    const parsed = createLotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const lot = await createLot(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: lot }, { status: 201 });
  });
}
