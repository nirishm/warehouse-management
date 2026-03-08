import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { getSaleById, cancelSale } from '@/modules/sale/queries/sales';
import { createTenantClient } from '@/core/db/tenant-query';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'sale');
    requirePermission(ctx, 'canSale');

    const sale = await getSaleById(ctx.schemaName, id);
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    if (ctx.allowedLocationIds !== null && !ctx.allowedLocationIds.includes(sale.location_id)) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    return NextResponse.json({ data: sale });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'sale');
    requirePermission(ctx, 'canSale');

    const sale = await getSaleById(ctx.schemaName, id);
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    if (ctx.allowedLocationIds !== null && !ctx.allowedLocationIds.includes(sale.location_id)) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const cancelled = await cancelSale(ctx.schemaName, id);

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'cancel',
      entity_type: 'sale',
      entity_id: id,
      old_data: sale as unknown as Record<string, unknown>,
      new_data: cancelled as unknown as Record<string, unknown>,
    }).catch((e) => console.error('Audit log error:', e));

    return NextResponse.json({ data: cancelled });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'sale');
    requirePermission(ctx, 'canSale');

    const sale = await getSaleById(ctx.schemaName, id);
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    if (ctx.allowedLocationIds !== null && !ctx.allowedLocationIds.includes(sale.location_id)) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const client = createTenantClient(ctx.schemaName);
    const { error } = await client
      .from('sales')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
    }

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'delete',
      entity_type: 'sale',
      entity_id: id,
      old_data: sale as unknown as Record<string, unknown>,
    }).catch((e) => console.error('Audit log error:', e));

    return new NextResponse(null, { status: 204 });
  });
}
