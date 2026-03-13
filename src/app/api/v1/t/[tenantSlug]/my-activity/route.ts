import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { listAuditEntries } from '@/modules/audit-trail/queries/audit';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      if (!ctx.userId) {
        return NextResponse.json({ entries: [] });
      }

      const { data } = await listAuditEntries(
        ctx.tenantId,
        { userId: ctx.userId },
        { limit: 20, offset: 0 },
      );

      const entries = data.map((entry) => {
        const newData = entry.newData as Record<string, unknown> | null;
        const sequenceNumber =
          newData && typeof newData === 'object' && 'sequenceNumber' in newData
            ? String(newData.sequenceNumber)
            : null;

        const description = sequenceNumber
          ? sequenceNumber
          : entry.entityType.charAt(0).toUpperCase() + entry.entityType.slice(1);

        return {
          id: entry.id,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          description,
          createdAt: entry.createdAt,
        };
      });

      return NextResponse.json({ entries });
    } catch (error) {
      return errorResponse(error);
    }
  },
);
