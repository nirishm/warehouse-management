import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requirePermission, requireModule } from '@/core/auth/guards';
import { listCommodities, createCommodity } from '@/modules/inventory/queries/commodities';
import { createCommoditySchema } from '@/modules/inventory/validations/commodity';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    // Allow read access for users who can purchase, dispatch, receive, sale, or view stock
    // (not just canManageCommodities which is for CRUD management)
    const canRead = ctx.role === 'tenant_admin' ||
      ctx.permissions.canManageCommodities ||
      ctx.permissions.canPurchase ||
      ctx.permissions.canDispatch ||
      ctx.permissions.canReceive ||
      ctx.permissions.canSale ||
      ctx.permissions.canViewStock;
    if (!canRead) {
      throw new Error('Missing permission: canManageCommodities');
    }

    const commodities = await listCommodities(ctx.schemaName);
    return NextResponse.json({ data: commodities });
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
    return NextResponse.json({ data: commodity }, { status: 201 });
  });
}
