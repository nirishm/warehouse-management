import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { voidPayment } from '@/modules/payments/queries/payments';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'payments');
    requirePermission(ctx, 'canManagePayments');

    const { id } = await params;
    const payment = await voidPayment(ctx.schemaName, id);
    return NextResponse.json({ data: payment });
  });
}
