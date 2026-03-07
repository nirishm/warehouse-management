import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule } from '@/core/auth/guards';
import { updateUserLocations } from '@/modules/user-management/queries/users';
import { updateUserLocationsSchema } from '@/modules/user-management/validations/user';

type RouteContext = { params: Promise<{ userId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'user_management');

    if (ctx.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateUserLocationsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await updateUserLocations(ctx.schemaName, userId, parsed.data.location_ids);
    return NextResponse.json({ success: true });
  });
}
