import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getDispatchById } from '@/modules/dispatch/queries/dispatches';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'dispatch');
    requirePermission(ctx, 'canDispatch');

    const dispatch = await getDispatchById(ctx.schemaName, id);
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }
    return NextResponse.json({ data: dispatch });
  });
}
