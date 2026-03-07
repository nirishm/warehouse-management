import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listAuditEntries } from '@/modules/audit-trail/queries/audit-log';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'audit_trail');
    requirePermission(ctx, 'canViewAuditLog');

    const { searchParams } = new URL(request.url);
    const entity_type = searchParams.get('entity_type') || undefined;
    const action = searchParams.get('action') || undefined;
    const user_id = searchParams.get('user_id') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await listAuditEntries(ctx.schemaName, {
      entity_type,
      action,
      user_id,
      from,
      to,
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
    });

    return NextResponse.json({
      data: result.data,
      count: result.count,
      limit,
      offset,
    });
  });
}
