import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listPayments, createPayment } from '@/modules/payments/queries/payments';
import { createPaymentSchema } from '@/modules/payments/validations/payment';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'payments');
    requirePermission(ctx, 'canManagePayments');

    const pagination = parsePagination(request.nextUrl.searchParams);
    const result = await listPayments(ctx.schemaName, { pagination });
    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'payments');
    requirePermission(ctx, 'canManagePayments');

    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);
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
