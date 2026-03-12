import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { createTenantClient } from '@/core/db/tenant-query';

interface SearchResult {
  type: 'dispatch' | 'purchase' | 'sale' | 'commodity';
  id: string;
  label: string;
  url: string;
}

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    const q = request.nextUrl.searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const tenantClient = createTenantClient(ctx.schemaName);
    const pattern = `%${q}%`;
    const results: SearchResult[] = [];

    const queries: Promise<void>[] = [];

    // Dispatches — requires 'dispatch' module
    if (ctx.enabledModules.includes('dispatch')) {
      queries.push(
        (async () => {
          const { data } = await tenantClient
            .from('dispatches')
            .select('id, dispatch_number')
            .is('deleted_at', null)
            .ilike('dispatch_number', pattern)
            .limit(5);
          for (const d of data ?? []) {
            results.push({
              type: 'dispatch',
              id: d.id,
              label: d.dispatch_number,
              url: `/dispatches/${d.dispatch_number}`,
            });
          }
        })()
      );
    }

    // Purchases — requires 'purchase' module
    if (ctx.enabledModules.includes('purchase')) {
      queries.push(
        (async () => {
          const { data } = await tenantClient
            .from('purchases')
            .select('id, purchase_number')
            .is('deleted_at', null)
            .ilike('purchase_number', pattern)
            .limit(5);
          for (const p of data ?? []) {
            results.push({
              type: 'purchase',
              id: p.id,
              label: p.purchase_number,
              url: `/purchases/${p.purchase_number}`,
            });
          }
        })()
      );
    }

    // Sales — requires 'sale' module
    if (ctx.enabledModules.includes('sale')) {
      queries.push(
        (async () => {
          const { data } = await tenantClient
            .from('sales')
            .select('id, sale_number')
            .is('deleted_at', null)
            .ilike('sale_number', pattern)
            .limit(5);
          for (const s of data ?? []) {
            results.push({
              type: 'sale',
              id: s.id,
              label: s.sale_number,
              url: `/sales/${s.sale_number}`,
            });
          }
        })()
      );
    }

    // Commodities — always available (core entity)
    queries.push(
      (async () => {
        const { data } = await tenantClient
          .from('commodities')
          .select('id, name, code')
          .is('deleted_at', null)
          .or(`name.ilike.${pattern},code.ilike.${pattern}`)
          .limit(5);
        for (const c of data ?? []) {
          results.push({
            type: 'commodity',
            id: c.id,
            label: c.code ? `${c.name} (${c.code})` : c.name,
            url: `/settings/commodities`,
          });
        }
      })()
    );

    await Promise.all(queries);

    return NextResponse.json({ results });
  });
}
