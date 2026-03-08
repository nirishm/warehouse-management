import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { confirmReturn, getReturn } from '@/modules/returns/queries/returns';

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
    return NextResponse.json({ data: ret });
  });
}
