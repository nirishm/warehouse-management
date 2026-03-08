import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getPaymentsForTransaction, createPayment, getBalance } from '@/modules/payments/queries/payments';
import { getSaleById } from '@/modules/sale/queries/sales';
import { createPaymentSchema } from '@/modules/payments/validations/payment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'payments');
    requirePermission(ctx, 'canManagePayments');

    const { id } = await params;
    const sale = await getSaleById(ctx.schemaName, id);
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    if (ctx.allowedLocationIds !== null && !ctx.allowedLocationIds.includes(sale.location_id)) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const [payments, balance] = await Promise.all([
      getPaymentsForTransaction(ctx.schemaName, 'sale', id),
      getBalance(ctx.schemaName, 'sale', id),
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
    const sale = await getSaleById(ctx.schemaName, id);
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    if (ctx.allowedLocationIds !== null && !ctx.allowedLocationIds.includes(sale.location_id)) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createPaymentSchema.safeParse({
      ...body,
      transaction_type: 'sale',
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
