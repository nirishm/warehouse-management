import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listDispatches, createDispatch } from '@/modules/dispatch/queries/dispatches';
import { createDispatchSchema } from '@/modules/dispatch/validations/dispatch';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'dispatch');
    requirePermission(ctx, 'canDispatch');

    const dispatches = await listDispatches(ctx.schemaName);
    return NextResponse.json({ data: dispatches });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'dispatch');
    requirePermission(ctx, 'canDispatch');

    const body = await request.json();
    const parsed = createDispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const dispatch = await createDispatch(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: dispatch }, { status: 201 });
  });
}
