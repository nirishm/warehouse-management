import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requirePermission, requireModule } from '@/core/auth/guards';
import { receiveDispatch } from '@/modules/dispatch/queries/receive';
import { getDispatchById } from '@/modules/dispatch/queries/dispatches';
import { receiveDispatchSchema } from '@/modules/dispatch/validations/receive';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';

type RouteContext = { params: Promise<{ tenantSlug: string; id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'dispatch');
    requirePermission(ctx, 'canReceive');

    const { id } = await params;

    const dispatch = await getDispatchById(ctx.schemaName, id);
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }
    if (
      ctx.allowedLocationIds !== null &&
      !ctx.allowedLocationIds.includes(dispatch.dest_location_id)
    ) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = receiveDispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    try {
      const result = await receiveDispatch(
        ctx.schemaName,
        id,
        parsed.data.items,
        ctx.userId
      );

      createAuditEntry(ctx.schemaName, {
        user_id: ctx.userId,
        user_name: ctx.userName,
        action: 'receive',
        entity_type: 'dispatch',
        entity_id: id,
        new_data: result as unknown as Record<string, unknown>,
      }).catch((e) => console.error('Audit log error:', e));

      return NextResponse.json(result);
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
