import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission, requireLocationAccess } from '@/core/auth/guards';
import { listAdjustments, createAdjustment } from '@/modules/adjustments/queries/adjustments';
import { createAdjustmentSchema } from '@/modules/adjustments/validations/adjustment';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'adjustments');
    requirePermission(ctx, 'canManageAdjustments');

    const pagination = parsePagination(request.nextUrl.searchParams);
    const result = await listAdjustments(ctx.schemaName, {
      allowedLocationIds: ctx.allowedLocationIds,
      pagination,
    });
    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'adjustments');
    requirePermission(ctx, 'canManageAdjustments');

    const body = await request.json();
    const parsed = createAdjustmentSchema.safeParse(body);

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

    const adjustment = await createAdjustment(ctx.schemaName, parsed.data, ctx.userId);

    return NextResponse.json({ data: adjustment }, { status: 201 });
  });
}
