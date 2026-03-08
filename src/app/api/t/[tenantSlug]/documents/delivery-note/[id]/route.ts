import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getSaleById } from '@/modules/sale/queries/sales';
import { getDocumentConfig } from '@/modules/document-gen/queries/config';
import { DeliveryNoteDocument } from '@/modules/document-gen/templates/delivery-note';
import React from 'react';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'document-gen');
    requirePermission(ctx, 'canGenerateDocuments');

    const { id } = await params;
    const [sale, config] = await Promise.all([
      getSaleById(ctx.schemaName, id),
      getDocumentConfig(ctx.schemaName),
    ]);

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
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

    const s = sale as unknown as Record<string, unknown>;
    const noteData = {
      sale_number: s.sale_number as string,
      sale_date: s.sale_date as string,
      status: s.status as string,
      notes: s.notes as string | null,
      location: s.location as { name: string } | null,
      contact: s.contact as { name: string } | null,
      sale_items: (s.items as unknown[]) ?? [],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(DeliveryNoteDocument, { data: noteData as never, config: safeConfig }) as never
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${noteData.sale_number}.pdf"`,
      },
    });
  });
}
