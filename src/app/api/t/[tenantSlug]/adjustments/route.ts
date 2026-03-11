import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission, requireLocationAccess } from '@/core/auth/guards';
import { listAdjustments, createAdjustment } from '@/modules/adjustments/queries/adjustments';
import { createAdjustmentSchema } from '@/modules/adjustments/validations/adjustment';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'adjustments');
    requirePermission(ctx, 'canManageAdjustments');

    const adjustments = await listAdjustments(ctx.schemaName, {
      allowedLocationIds: ctx.allowedLocationIds,
    });
    return NextResponse.json({ data: adjustments });
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

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'create',
      entity_type: 'adjustment',
      entity_id: adjustment.id,
      new_data: adjustment as unknown as Record<string, unknown>,
    }).catch((e) => console.error('Audit log error:', e));

    return NextResponse.json({ data: adjustment }, { status: 201 });
  });
}
