import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listLocations, createLocation } from '@/modules/inventory/queries/locations';
import { createLocationSchema } from '@/modules/inventory/validations/location';
import { PermissionError } from '@/core/errors';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    // Allow read access for users who can purchase, dispatch, receive, sale, or view stock
    // (not just canManageLocations which is for CRUD management)
    const canRead = ctx.role === 'tenant_admin' ||
      ctx.permissions.canManageLocations ||
      ctx.permissions.canPurchase ||
      ctx.permissions.canDispatch ||
      ctx.permissions.canReceive ||
      ctx.permissions.canSale ||
      ctx.permissions.canViewStock;
    if (!canRead) {
      throw new PermissionError('canManageLocations');
    }

    const locations = await listLocations(ctx.schemaName);
    return NextResponse.json({ data: locations });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'inventory');
    requirePermission(ctx, 'canManageLocations');

    const body = await request.json();
    const parsed = createLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const location = await createLocation(ctx.schemaName, parsed.data);
    return NextResponse.json({ data: location }, { status: 201 });
  });
}
