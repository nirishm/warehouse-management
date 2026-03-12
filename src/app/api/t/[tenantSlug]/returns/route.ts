import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission, requireLocationAccess } from '@/core/auth/guards';
import { listReturns, createReturn } from '@/modules/returns/queries/returns';
import { createReturnSchema } from '@/modules/returns/validations/return';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'returns');
    requirePermission(ctx, 'canManageReturns');

    const pagination = parsePagination(request.nextUrl.searchParams);
    const result = await listReturns(ctx.schemaName, {
      allowedLocationIds: ctx.allowedLocationIds,
      pagination,
    });
    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'returns');
    requirePermission(ctx, 'canManageReturns');

    const body = await request.json();
    const parsed = createReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      requireLocationAccess(ctx, parsed.data.location_id);
    } catch {
      return NextResponse.json({ error: 'Access denied: location not assigned' }, { status: 403 });
    }

    const ret = await createReturn(ctx.schemaName, parsed.data, ctx.userId);

    return NextResponse.json({ data: ret }, { status: 201 });
  });
}
