import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getDispatchById, cancelDispatch } from '@/modules/dispatch/queries/dispatches';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';

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
    if (
      ctx.allowedLocationIds !== null &&
      !ctx.allowedLocationIds.includes(dispatch.origin_location_id) &&
      !ctx.allowedLocationIds.includes(dispatch.dest_location_id)
    ) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }
    return NextResponse.json({ data: dispatch });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'dispatch');
    requirePermission(ctx, 'canDispatch');

    const dispatch = await getDispatchById(ctx.schemaName, id);
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }
    if (
      ctx.allowedLocationIds !== null &&
      !ctx.allowedLocationIds.includes(dispatch.origin_location_id) &&
      !ctx.allowedLocationIds.includes(dispatch.dest_location_id)
    ) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    await cancelDispatch(ctx.schemaName, id);

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'update',
      entity_type: 'dispatch',
      entity_id: id,
      old_data: dispatch as unknown as Record<string, unknown>,
      new_data: { status: 'cancelled' },
    }).catch((e) => console.error('Audit log error:', e));

    return NextResponse.json({ data: { id, status: 'cancelled' } });
  });
}
