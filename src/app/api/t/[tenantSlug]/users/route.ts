import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule } from '@/core/auth/guards';
import { listUsers } from '@/modules/user-management/queries/users';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'user_management');

    if (ctx.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await listUsers(ctx.schemaName, ctx.tenantId);
    return NextResponse.json({ data: users });
  });
}
