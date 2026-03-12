import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule } from '@/core/auth/guards';
import { getUserById, updateUserProfile } from '@/modules/user-management/queries/users';
import { updateUserProfileSchema } from '@/modules/user-management/validations/user';

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'user-management');

    if (ctx.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await getUserById(ctx.schemaName, ctx.tenantId, userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ data: user });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'user-management');

    if (ctx.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateUserProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateUserProfile(ctx.schemaName, userId, parsed.data);
    return NextResponse.json({ data: updated });
  });
}
