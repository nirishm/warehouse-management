import { NextRequest, NextResponse } from 'next/server';
import type { TenantContext } from './types';
import type { Permission } from './permissions';
import { hasPermission } from './permissions';
import { ApiError, errorResponse } from '../api/error-handler';
import { checkRateLimit } from '../api/with-rate-limit';

export function withTenantContext(
  handler: (req: NextRequest, ctx: TenantContext) => Promise<NextResponse>,
  options?: { permission?: Permission },
) {
  return async (
    req: NextRequest,
    _routeContext?: { params: Promise<Record<string, string>> },
  ) => {
    try {
      // Check rate limits before any other logic
      const rateLimitResponse = await checkRateLimit(req);
      if (rateLimitResponse) return rateLimitResponse;

      // Read headers injected by middleware
      const tenantId = req.headers.get('x-tenant-id');
      const tenantSlug = req.headers.get('x-tenant-slug');
      const role = req.headers.get('x-tenant-role') as TenantContext['role'] | null;
      const modulesJson = req.headers.get('x-tenant-modules');
      const userId = req.headers.get('x-user-id');
      const userEmail = req.headers.get('x-user-email');

      if (!tenantId || !tenantSlug || !role || !userId || !userEmail) {
        throw new ApiError(401, 'Unauthorized: missing tenant context');
      }

      const enabledModules: string[] = modulesJson ? JSON.parse(modulesJson) : [];

      const ctx: TenantContext = {
        tenantId,
        tenantSlug,
        role,
        userId,
        userEmail,
        enabledModules,
      };

      // Check permission if required
      if (options?.permission && !hasPermission(role, options.permission)) {
        throw new ApiError(403, `Forbidden: requires '${options.permission}' permission`);
      }

      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
