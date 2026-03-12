import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listUsers, inviteUser } from '@/modules/user-management/queries/users';
import { inviteUserSchema } from '@/modules/user-management/validations/user';
import type { Role } from '@/core/auth/types';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        search: searchParams.get('search') ?? undefined,
        role: searchParams.get('role') ?? undefined,
      };

      const { data, total } = await listUsers(ctx.tenantId, filters, pagination);

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
  { permission: 'users:manage' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = inviteUserSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { email, role, displayName } = parsed.data;

      const user = await inviteUser(
        ctx.tenantId,
        email,
        role as Exclude<Role, 'owner'>,
        displayName,
        ctx.userId,
      );

      return NextResponse.json({ data: user }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'users:manage' },
);
