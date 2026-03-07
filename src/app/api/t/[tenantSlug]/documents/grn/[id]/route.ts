import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getPurchaseById } from '@/modules/purchase/queries/purchases';
import { getDocumentConfig } from '@/modules/document-gen/queries/config';
import { GRNDocument } from '@/modules/document-gen/templates/grn';
import React from 'react';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'document-gen');
    requirePermission(ctx, 'canGenerateDocuments');

    const { id } = await params;
    const [purchase, config] = await Promise.all([
      getPurchaseById(ctx.schemaName, id),
      getDocumentConfig(ctx.schemaName),
    ]);

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const safeConfig = config ?? {
      id: '',
      company_name: '',
      company_address: null,
      company_phone: null,
      company_email: null,
      company_gstin: null,
      logo_url: null,
      footer_text: null,
      updated_by: null,
      updated_at: new Date().toISOString(),
    };

    const p = purchase as unknown as Record<string, unknown>;
    const grnData = {
      purchase_number: p.purchase_number as string,
      purchase_date: p.purchase_date as string,
      status: p.status as string,
      notes: p.notes as string | null,
      location: p.location as { name: string } | null,
      contact: p.contact as { name: string } | null,
      purchase_items: (p.items as unknown[]) ?? [],
    };

    const buffer = await renderToBuffer(
      React.createElement(GRNDocument, { data: grnData as never, config: safeConfig }) as never
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${grnData.purchase_number}.pdf"`,
      },
    });
  });
}
