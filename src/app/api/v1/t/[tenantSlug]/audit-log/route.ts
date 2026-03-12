import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listAuditEntries } from '@/modules/audit-trail/queries/audit';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        entityType: searchParams.get('entityType') ?? undefined,
        entityId: searchParams.get('entityId') ?? undefined,
        userId: searchParams.get('userId') ?? undefined,
        action: searchParams.get('action') ?? undefined,
        dateFrom: searchParams.get('dateFrom') ?? undefined,
        dateTo: searchParams.get('dateTo') ?? undefined,
      };

      const { data, total } = await listAuditEntries(ctx.tenantId, filters, pagination);

      return NextResponse.json({
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'audit:read' },
);
