import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import {
  getContactById,
  updateContact,
  softDeleteContact,
} from '@/modules/inventory/queries/contacts';
import { updateContactSchema } from '@/modules/inventory/validations/contact';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageContacts');

    const contact = await getContactById(ctx.schemaName, id);
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json({ data: contact });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageContacts');

    const body = await request.json();

    // Allow is_active toggle alongside schema fields
    const { is_active, ...rest } = body;
    const parsed = updateContactSchema.safeParse(rest);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = {
      ...parsed.data,
      ...(typeof is_active === 'boolean' ? { is_active } : {}),
    };

    const contact = await updateContact(ctx.schemaName, id, updateData);
    return NextResponse.json({ data: contact });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageContacts');

    await softDeleteContact(ctx.schemaName, id);
    return NextResponse.json({ success: true });
  });
}
