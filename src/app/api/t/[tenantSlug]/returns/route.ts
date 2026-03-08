import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission, requireLocationAccess } from '@/core/auth/guards';
import { listReturns, createReturn } from '@/modules/returns/queries/returns';
import { createReturnSchema } from '@/modules/returns/validations/return';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'returns');
    requirePermission(ctx, 'canManageReturns');

    const returns = await listReturns(ctx.schemaName, { allowedLocationIds: ctx.allowedLocationIds });
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

    try {
      requireLocationAccess(ctx, parsed.data.location_id);
    } catch {
      return NextResponse.json({ error: 'Access denied: location not assigned' }, { status: 403 });
    }

    const ret = await createReturn(ctx.schemaName, parsed.data, ctx.userId);

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'create',
      entity_type: 'return',
      entity_id: ret.id,
      new_data: ret as unknown as Record<string, unknown>,
    }).catch((e) => console.error('Audit log error:', e));

    return NextResponse.json({ data: ret }, { status: 201 });
  });
}
