import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listReturns, createReturn } from '@/modules/returns/queries/returns';
import { createReturnSchema } from '@/modules/returns/validations/return';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'returns');
    requirePermission(ctx, 'canManageReturns');

    const returns = await listReturns(ctx.schemaName);
    return NextResponse.json({ data: returns });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'returns');
    requirePermission(ctx, 'canManageReturns');

    const body = await request.json();
    const parsed = createReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ret = await createReturn(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: ret }, { status: 201 });
  });
}
