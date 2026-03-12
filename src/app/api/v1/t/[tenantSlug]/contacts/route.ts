import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import { parsePagination } from '@/lib/pagination';
import { listContacts, createContact } from '@/modules/inventory/queries/contacts';
import { createContactSchema } from '@/modules/inventory/validations/contact';

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const pagination = parsePagination(searchParams);
      const filters = {
        search: searchParams.get('search') ?? undefined,
        type: searchParams.get('type') ?? undefined,
        isActive: searchParams.has('isActive')
          ? searchParams.get('isActive') === 'true'
          : undefined,
      };

      const { data, total } = await listContacts(ctx.tenantId, filters, pagination);

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
  { permission: 'items:read' },
);

export const POST = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const parsed = createContactSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const contact = await createContact(ctx.tenantId, parsed.data, ctx.userId);
      return NextResponse.json({ data: contact }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'items:write' },
);
