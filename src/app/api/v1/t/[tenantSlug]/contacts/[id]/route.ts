import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  getContact,
  updateContact,
  softDeleteContact,
} from '@/modules/inventory/queries/contacts';
import { updateContactSchema } from '@/modules/inventory/validations/contact';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const contact = await getContact(ctx.tenantId, id);
      if (!contact) {
        throw new ApiError(404, 'Contact not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: contact });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'items:read' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateContactSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const contact = await updateContact(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!contact) {
        throw new ApiError(404, 'Contact not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: contact });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'items:write' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const contact = await softDeleteContact(ctx.tenantId, id, ctx.userId);
      if (!contact) {
        throw new ApiError(404, 'Contact not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: contact });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'items:write' },
);
