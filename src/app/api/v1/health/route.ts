import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';

export const GET = withTenantContext(async (_req: NextRequest, ctx) => {
  return NextResponse.json({
    status: 'ok',
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      role: ctx.role,
      modules: ctx.enabledModules,
    },
    user: {
      id: ctx.userId,
      email: ctx.userEmail,
    },
  });
});
