import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requirePermission, requireModule } from '@/core/auth/guards';
import { listCommodities, createCommodity } from '@/modules/inventory/queries/commodities';
import { createCommoditySchema } from '@/modules/inventory/validations/commodity';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageCommodities');

    const commodities = await listCommodities(ctx.schemaName);
    return NextResponse.json(commodities);
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageCommodities');

    const body = await request.json();
    const parsed = createCommoditySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const commodity = await createCommodity(ctx.schemaName, parsed.data);
    return NextResponse.json(commodity, { status: 201 });
  });
}
