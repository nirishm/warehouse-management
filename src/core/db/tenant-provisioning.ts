import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export async function provisionTenantSchema(tenantSlug: string): Promise<string> {
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(tenantSlug)) {
    throw new Error(`Invalid tenant slug: "${tenantSlug}"`);
  }
  const schemaName = `tenant_${tenantSlug.replace(/-/g, '_')}`;
  const admin = createAdminClient();

  const templatePath = path.join(process.cwd(), 'supabase/migrations/00002_tenant_template.sql');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const sql = template.replace(/{schema}/g, schemaName);

  const { error: schemaError } = await admin.rpc('exec_sql', {
    query: `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`
  });
  if (schemaError) throw new Error(`Failed to create schema: ${schemaError.message}`);

  const { error: templateError } = await admin.rpc('exec_sql', { query: sql });
  if (templateError) throw new Error(`Failed to provision tenant: ${templateError.message}`);

  return schemaName;
}
