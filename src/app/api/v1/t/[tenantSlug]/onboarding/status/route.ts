import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { listItems } from '@/modules/inventory/queries/items';
import { listLocations } from '@/modules/inventory/queries/locations';
import { listUnits } from '@/modules/inventory/queries/units';

export const GET = withTenantContext(async (req: NextRequest, ctx) => {
  try {
    const [locationsResult, unitsResult, itemsResult] = await Promise.all([
      listLocations(ctx.tenantId, {}, { limit: 1, offset: 0 }),
      listUnits(ctx.tenantId, {}, { limit: 1, offset: 0 }),
      listItems(ctx.tenantId, {}, { limit: 1, offset: 0 }),
    ]);

    const hasLocations = locationsResult.total > 0;
    const hasUnits = unitsResult.total > 0;
    const hasItems = itemsResult.total > 0;
    const needed = !hasLocations || !hasUnits || !hasItems;

    return NextResponse.json({ needed, hasLocations, hasUnits, hasItems });
  } catch (error) {
    return errorResponse(error);
  }
});
