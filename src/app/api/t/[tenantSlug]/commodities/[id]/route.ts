import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requirePermission, requireModule } from '@/core/auth/guards';
import {
  getCommodityById,
  updateCommodity,
  softDeleteCommodity,
} from '@/modules/inventory/queries/commodities';
import { updateCommoditySchema } from '@/modules/inventory/validations/commodity';

type RouteContext = { params: Promise<{ tenantSlug: string; id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageCommodities');

    const { id } = await params;
    const commodity = await getCommodityById(ctx.schemaName, id);

    if (!commodity) {
      return NextResponse.json({ error: 'Commodity not found' }, { status: 404 });
    }

    return NextResponse.json(commodity);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageCommodities');

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCommoditySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const commodity = await updateCommodity(ctx.schemaName, id, parsed.data);
    return NextResponse.json(commodity);
  });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageCommodities');

    const { id } = await params;
    await softDeleteCommodity(ctx.schemaName, id);
    return NextResponse.json({ success: true });
  });
}
