import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getPurchaseById } from '@/modules/purchase/queries/purchases';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'purchase');
    requirePermission(ctx, 'canPurchase');

    const purchase = await getPurchaseById(ctx.schemaName, id);
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    return NextResponse.json({ data: purchase });
  });
}
