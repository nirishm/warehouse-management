import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { db } from '@/core/db/drizzle';
import { locations, units, items } from '@/core/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const GET = withTenantContext(
  async (_req: NextRequest, ctx) => {
    try {
      const [locationCount, unitCount, itemCount] = await Promise.all([
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(locations)
          .where(
            and(eq(locations.tenantId, ctx.tenantId), isNull(locations.deletedAt))
          ),
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(units)
          .where(
            and(eq(units.tenantId, ctx.tenantId), isNull(units.deletedAt))
          ),
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(items)
          .where(
            and(eq(items.tenantId, ctx.tenantId), isNull(items.deletedAt))
          ),
      ]);

      const hasLocations = Number(locationCount[0]?.count ?? 0) > 0;
      const hasUnits = Number(unitCount[0]?.count ?? 0) > 0;
      const hasItems = Number(itemCount[0]?.count ?? 0) > 0;

      return NextResponse.json({
        needed: !hasLocations || !hasUnits || !hasItems,
        hasLocations,
        hasUnits,
        hasItems,
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);
