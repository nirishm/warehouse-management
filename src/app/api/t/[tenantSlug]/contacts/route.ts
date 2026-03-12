import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listContacts, createContact } from '@/modules/inventory/queries/contacts';
import { createContactSchema } from '@/modules/inventory/validations/contact';
import type { ContactType } from '@/modules/inventory/validations/contact';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageContacts');

    const type = request.nextUrl.searchParams.get('type') as ContactType | null;
    const pagination = parsePagination(request.nextUrl.searchParams);

    const result = await listContacts(
      ctx.schemaName,
      type && ['supplier', 'customer', 'both'].includes(type) ? type : undefined,
      { pagination }
    );
    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageContacts');

    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const contact = await createContact(ctx.schemaName, parsed.data);
    return NextResponse.json({ data: contact }, { status: 201 });
  });
}
