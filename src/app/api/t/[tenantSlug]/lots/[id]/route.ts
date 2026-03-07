import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule } from '@/core/auth/guards';
import { getLot } from '@/modules/lot-tracking/queries/lots';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'lot-tracking');

    const lot = await getLot(ctx.schemaName, id);
    if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    return NextResponse.json({ data: lot });
  });
}
