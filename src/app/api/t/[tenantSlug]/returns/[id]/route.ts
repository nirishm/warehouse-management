import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getReturn } from '@/modules/returns/queries/returns';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'returns');
    requirePermission(ctx, 'canManageReturns');

    const ret = await getReturn(ctx.schemaName, id);
    if (!ret) return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    return NextResponse.json({ data: ret });
  });
}
