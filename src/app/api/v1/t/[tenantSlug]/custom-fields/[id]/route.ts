import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { ApiError, errorResponse } from '@/core/api/error-handler';
import {
  getCustomField,
  updateCustomField,
  hardDeleteCustomField,
} from '@/modules/inventory/queries/custom-fields';
import { updateCustomFieldSchema } from '@/modules/inventory/validations/custom-field';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const GET = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const field = await getCustomField(ctx.tenantId, id);
      if (!field) {
        throw new ApiError(404, 'Custom field not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: field });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'settings:manage' },
);

export const PATCH = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      const body = await req.json();
      const parsed = updateCustomFieldSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR');
      }

      const field = await updateCustomField(ctx.tenantId, id, parsed.data, ctx.userId);
      if (!field) {
        throw new ApiError(404, 'Custom field not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: field });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'settings:manage' },
);

export const DELETE = withTenantContext(
  async (req: NextRequest, ctx) => {
    try {
      const id = extractId(req);
      // Custom field definitions use hard delete (they are metadata, no soft delete column)
      const field = await hardDeleteCustomField(ctx.tenantId, id, ctx.userId);
      if (!field) {
        throw new ApiError(404, 'Custom field not found', 'NOT_FOUND');
      }
      return NextResponse.json({ data: field });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'settings:manage' },
);
