import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getPaymentsForTransaction, createPayment, getBalance } from '@/modules/payments/queries/payments';
import { getPurchaseById } from '@/modules/purchase/queries/purchases';
import { createPaymentSchema } from '@/modules/payments/validations/payment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'payments');
    requirePermission(ctx, 'canManagePayments');

    const { id } = await params;
    const purchase = await getPurchaseById(ctx.schemaName, id);
    if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    if (ctx.allowedLocationIds !== null && !ctx.allowedLocationIds.includes(purchase.location_id)) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const [payments, balance] = await Promise.all([
      getPaymentsForTransaction(ctx.schemaName, 'purchase', id),
      getBalance(ctx.schemaName, 'purchase', id),
    ]);
    return NextResponse.json({ data: payments, balance });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'payments');
    requirePermission(ctx, 'canManagePayments');

    const { id } = await params;
    const purchase = await getPurchaseById(ctx.schemaName, id);
    if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    if (ctx.allowedLocationIds !== null && !ctx.allowedLocationIds.includes(purchase.location_id)) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createPaymentSchema.safeParse({
      ...body,
      transaction_type: 'purchase',
      transaction_id: id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payment = await createPayment(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: payment }, { status: 201 });
  });
}
