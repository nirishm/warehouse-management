import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import {
  getLocationById,
  updateLocation,
  softDeleteLocation,
} from '@/modules/inventory/queries/locations';
import { updateLocationSchema } from '@/modules/inventory/validations/location';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageLocations');

    const location = await getLocationById(ctx.schemaName, id);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    return NextResponse.json({ data: location });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageLocations');

    const body = await request.json();

    // Allow is_active toggle alongside schema fields
    const { is_active, ...rest } = body;
    const parsed = updateLocationSchema.safeParse(rest);

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

    const location = await updateLocation(ctx.schemaName, id, updateData);
    return NextResponse.json({ data: location });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageLocations');

    await softDeleteLocation(ctx.schemaName, id);
    return NextResponse.json({ success: true });
  });
}
