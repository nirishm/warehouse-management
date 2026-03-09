import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule } from '@/core/auth/guards';
import { listUnits } from '@/modules/inventory/queries/units';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');

    const units = await listUnits(ctx.schemaName);
    return NextResponse.json({ data: units });
  });
}
