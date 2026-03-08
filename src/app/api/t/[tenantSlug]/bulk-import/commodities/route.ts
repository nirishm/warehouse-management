import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { parseCSV } from '@/modules/bulk-import/utils/csv-parser';
import { commodityRowSchema, COMMODITIES_TEMPLATE_HEADERS } from '@/modules/bulk-import/schemas/commodities-csv';
import { importCommodities } from '@/modules/bulk-import/queries/import-commodities';

export async function GET() {
  const header = COMMODITIES_TEMPLATE_HEADERS.join(',');
  return new NextResponse(header + '\n', {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="commodities-template.csv"',
    },
  });
}

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (ctx) => {
    requireModule(ctx, 'bulk-import');
    requirePermission(ctx, 'canImportData');

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await (file as File).text();
    const { rows, errors: parseErrors } = parseCSV(text, commodityRowSchema);
    const result = await importCommodities(ctx.schemaName, rows, parseErrors);
    return NextResponse.json(result, { status: result.summary.failed > 0 ? 207 : 200 });
  });
}
