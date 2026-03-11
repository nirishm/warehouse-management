import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { listAdjustmentReasons, createAdjustmentReason } from '@/modules/adjustments/queries/adjustments';
import { createAdjustmentReasonSchema } from '@/modules/adjustments/validations/adjustment';
import { createAuditEntry } from '@/modules/audit-trail/queries/audit-log';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'adjustments');
    requirePermission(ctx, 'canManageAdjustments');

    const reasons = await listAdjustmentReasons(ctx.schemaName);
    return NextResponse.json({ data: reasons });
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'adjustments');
    requirePermission(ctx, 'canManageAdjustments');

    const body = await request.json();
    const parsed = createAdjustmentReasonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const reason = await createAdjustmentReason(ctx.schemaName, parsed.data);

    createAuditEntry(ctx.schemaName, {
      user_id: ctx.userId,
      user_name: ctx.userName,
      action: 'create',
      entity_type: 'adjustment_reason',
      entity_id: reason.id,
      new_data: reason as unknown as Record<string, unknown>,
    }).catch((e) => console.error('Audit log error:', e));

    return NextResponse.json({ data: reason }, { status: 201 });
  });
}
