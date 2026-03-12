import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { superAdmins } from '@/core/db/schema';
import { ApiError, errorResponse } from '@/core/api/error-handler';

export interface AdminContext {
  userId: string;
  userEmail: string;
}

export function withAdminContext(
  handler: (req: NextRequest, ctx: AdminContext) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const userEmail = req.headers.get('x-user-email');

      if (!userId || !userEmail) {
        throw new ApiError(401, 'Unauthorized');
      }

      // This is the ONE case where admin routes hit the DB
      const result = await db
        .select()
        .from(superAdmins)
        .where(eq(superAdmins.userId, userId));

      if (result.length === 0) {
        throw new ApiError(403, 'Forbidden: super admin access required');
      }

      return await handler(req, { userId, userEmail });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
