import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getDocumentConfig, updateDocumentConfig } from '@/modules/document-gen/queries/config';
import { updateDocumentConfigSchema } from '@/modules/document-gen/validations/config';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'document-gen');

    const config = await getDocumentConfig(ctx.schemaName);
    return NextResponse.json({ data: config });
  });
}

export async function PUT(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'document-gen');
    requirePermission(ctx, 'canGenerateDocuments');

    const body = await request.json();
    const parsed = updateDocumentConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const config = await updateDocumentConfig(ctx.schemaName, parsed.data, ctx.userId);
    return NextResponse.json({ data: config });
  });
}
