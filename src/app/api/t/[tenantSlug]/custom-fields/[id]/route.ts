import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import {
  updateCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from '@/modules/inventory/queries/custom-fields';
import { updateCustomFieldSchema } from '@/modules/inventory/validations/custom-field';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageLocations');

    const body = await request.json();
    const parsed = updateCustomFieldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const definition = await updateCustomFieldDefinition(
      ctx.schemaName,
      id,
      parsed.data
    );
    return NextResponse.json({ data: definition });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageLocations');

    await deleteCustomFieldDefinition(ctx.schemaName, id);
    return NextResponse.json({ success: true });
  });
}
