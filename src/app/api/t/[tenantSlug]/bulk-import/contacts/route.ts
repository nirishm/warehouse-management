import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, requireModule, requirePermission } from '@/core/auth/guards';
import { parseCSV } from '@/modules/bulk-import/utils/csv-parser';
import { contactRowSchema, CONTACTS_TEMPLATE_HEADERS } from '@/modules/bulk-import/schemas/contacts-csv';
import { importContacts } from '@/modules/bulk-import/queries/import-contacts';

export async function GET() {
  const header = CONTACTS_TEMPLATE_HEADERS.join(',');
  return new NextResponse(header + '\n', {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="contacts-template.csv"',
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
    const { rows, errors: parseErrors } = parseCSV(text, contactRowSchema);
    const result = await importContacts(ctx.schemaName, rows, parseErrors);
    return NextResponse.json(result, { status: result.summary.failed > 0 ? 207 : 200 });
  });
}
