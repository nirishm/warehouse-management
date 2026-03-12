import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission, requireLocationAccess } from '@/core/auth/guards';
import { listDispatches, createDispatch } from '@/modules/dispatch/queries/dispatches';
import { createDispatchSchema } from '@/modules/dispatch/validations/dispatch';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'dispatch');
    requirePermission(ctx, 'canDispatch');

    const pagination = parsePagination(request.nextUrl.searchParams);
    const result = await listDispatches(ctx.schemaName, {
      allowedLocationIds: ctx.allowedLocationIds,
      pagination,
    });
    return NextResponse.json(result);
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

    try {
      requireLocationAccess(ctx, parsed.data.origin_location_id);
      requireLocationAccess(ctx, parsed.data.dest_location_id);
    } catch {
      return NextResponse.json({ error: 'Access denied: location not assigned' }, { status: 403 });
    }

    const dispatch = await createDispatch(ctx.schemaName, parsed.data, ctx.userId);

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'create',
      entity_type: 'dispatch',
      entity_id: dispatch.id,
      new_data: dispatch as unknown as Record<string, unknown>,
    }).catch((e) => console.error('Audit log error:', e));

    return NextResponse.json({ data: dispatch }, { status: 201 });
  });
}
