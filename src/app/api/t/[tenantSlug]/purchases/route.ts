import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listPurchases, createPurchase } from '@/modules/purchase/queries/purchases';
import { createPurchaseSchema } from '@/modules/purchase/validations/purchase';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'purchase');
    requirePermission(ctx, 'canPurchase');

    const purchases = await listPurchases(ctx.schemaName, {
      allowedLocationIds: ctx.allowedLocationIds,
    });
    return NextResponse.json({ data: purchases });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'purchase');
    requirePermission(ctx, 'canPurchase');

    const body = await request.json();
    const parsed = createPurchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const purchase = await createPurchase(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: purchase }, { status: 201 });
  });
}
