import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission, requireLocationAccess } from '@/core/auth/guards';
import { listSales, createSale } from '@/modules/sale/queries/sales';
import { createSaleSchema } from '@/modules/sale/validations/sale';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'sale');
    requirePermission(ctx, 'canSale');

    const pagination = parsePagination(request.nextUrl.searchParams);
    const result = await listSales(ctx.schemaName, {
      allowedLocationIds: ctx.allowedLocationIds,
      pagination,
    });
    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'sale');
    requirePermission(ctx, 'canSale');

    const body = await request.json();
    const parsed = createSaleSchema.safeParse(body);

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

    const sale = await createSale(ctx.schemaName, parsed.data, ctx.userId);

    return NextResponse.json({ data: sale }, { status: 201 });
  });
}
