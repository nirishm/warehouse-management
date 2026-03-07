import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import {
  listCustomFieldDefinitions,
  createCustomFieldDefinition,
} from '@/modules/inventory/queries/custom-fields';
import { createCustomFieldSchema } from '@/modules/inventory/validations/custom-field';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageLocations');

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type') ?? undefined;

    const definitions = await listCustomFieldDefinitions(
      ctx.schemaName,
      entityType
    );
    return NextResponse.json({ data: definitions });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageLocations');

    const body = await request.json();
    const parsed = createCustomFieldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const definition = await createCustomFieldDefinition(
      ctx.schemaName,
      parsed.data
    );
    return NextResponse.json({ data: definition }, { status: 201 });
  });
}
