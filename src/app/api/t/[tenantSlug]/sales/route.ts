import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listSales, createSale } from '@/modules/sale/queries/sales';
import { createSaleSchema } from '@/modules/sale/validations/sale';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'sale');
    requirePermission(ctx, 'canSale');

    const sales = await listSales(ctx.schemaName);
    return NextResponse.json({ data: sales });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'sale');
    requirePermission(ctx, 'canSale');

    const body = await request.json();
    const parsed = createSaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const sale = await createSale(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: sale }, { status: 201 });
  });
}
