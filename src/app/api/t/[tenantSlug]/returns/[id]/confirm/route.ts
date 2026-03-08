import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { confirmReturn, getReturn } from '@/modules/returns/queries/returns';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'returns');
    requirePermission(ctx, 'canManageReturns');

    const existing = await getReturn(ctx.schemaName, id);
    if (!existing) return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    if (ctx.allowedLocationIds !== null && !ctx.allowedLocationIds.includes(existing.location_id)) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    const ret = await confirmReturn(ctx.schemaName, id);

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'confirm',
      entity_type: 'return',
      entity_id: id,
      old_data: existing as unknown as Record<string, unknown>,
      new_data: ret as unknown as Record<string, unknown>,
    }).catch((e) => console.error('Audit log error:', e));

    return NextResponse.json({ data: ret });
  });
}
