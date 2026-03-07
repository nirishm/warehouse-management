import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule } from '@/core/auth/guards';
import { createTenantClient } from '@/core/db/tenant-query';
import { generateQRCodeBuffer } from '@/modules/barcode/utils/generate-barcode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; commodityId: string }> }
) {
  const { commodityId } = await params;

  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'barcode');

    const client = createTenantClient(ctx.schemaName);
    const { data: commodity, error } = await client
      .from('commodities')
      .select('id, code, name')
      .eq('id', commodityId)
      .is('deleted_at', null)
      .single();

    if (error || !commodity) {
      return NextResponse.json({ error: 'Commodity not found' }, { status: 404 });
    }

    const buffer = await generateQRCodeBuffer(commodity.code as string);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${commodity.code}.png"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  });
}
