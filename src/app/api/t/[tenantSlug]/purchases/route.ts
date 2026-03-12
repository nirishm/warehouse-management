import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission, requireLocationAccess } from '@/core/auth/guards';
import { listPurchases, createPurchase } from '@/modules/purchase/queries/purchases';
import { createPurchaseSchema } from '@/modules/purchase/validations/purchase';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'purchase');
    requirePermission(ctx, 'canPurchase');

    const pagination = parsePagination(request.nextUrl.searchParams);
    const result = await listPurchases(ctx.schemaName, {
      allowedLocationIds: ctx.allowedLocationIds,
      pagination,
    });
    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'purchase');
    requirePermission(ctx, 'canPurchase');

    const body = await request.json();
    const parsed = createPurchaseSchema.safeParse(body);

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

    const purchase = await createPurchase(ctx.schemaName, parsed.data, ctx.userId);

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'create',
      entity_type: 'purchase',
      entity_id: purchase.id,
      new_data: purchase as unknown as Record<string, unknown>,
    }).catch((e) => console.error('Audit log error:', e));

    return NextResponse.json({ data: purchase }, { status: 201 });
  });
}
