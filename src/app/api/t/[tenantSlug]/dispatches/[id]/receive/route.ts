import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requirePermission, requireModule } from '@/core/auth/guards';
import { receiveDispatch } from '@/modules/dispatch/queries/receive';
import { receiveDispatchSchema } from '@/modules/dispatch/validations/receive';

type RouteContext = { params: Promise<{ tenantSlug: string; id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'dispatch');
    requirePermission(ctx, 'canReceive');

    const { id } = await params;
    const body = await request.json();
    const parsed = receiveDispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    try {
      const dispatch = await receiveDispatch(
        ctx.schemaName,
        id,
        parsed.data.items,
        ctx.userId
      );
      return NextResponse.json(dispatch);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to receive dispatch';

      if (message.includes('not found')) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      if (message.includes('cannot be received')) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      if (message.includes('does not belong')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
