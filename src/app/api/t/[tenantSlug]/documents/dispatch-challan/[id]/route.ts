import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getDispatchById } from '@/modules/dispatch/queries/dispatches';
import { getDocumentConfig } from '@/modules/document-gen/queries/config';
import { DispatchChallanDocument } from '@/modules/document-gen/templates/dispatch-challan';
import React from 'react';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'document-gen');
    requirePermission(ctx, 'canGenerateDocuments');

    const { id } = await params;
    const [dispatch, config] = await Promise.all([
      getDispatchById(ctx.schemaName, id),
      getDocumentConfig(ctx.schemaName),
    ]);

    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }
    if (
      ctx.allowedLocationIds !== null &&
      !ctx.allowedLocationIds.includes(dispatch.origin_location_id) &&
      !ctx.allowedLocationIds.includes(dispatch.dest_location_id)
    ) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
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

    // Map to template's expected shape (add requested_quantity fallback)
    const challanData = {
      ...dispatch,
      dispatch_items: dispatch.dispatch_items.map((item) => ({
        ...item,
        requested_quantity: item.sent_quantity ?? 0,
      })),
    };

    const buffer = await renderToBuffer(
      React.createElement(DispatchChallanDocument, { data: challanData as never, config: safeConfig }) as never
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${dispatch.dispatch_number}.pdf"`,
      },
    });
  });
}
