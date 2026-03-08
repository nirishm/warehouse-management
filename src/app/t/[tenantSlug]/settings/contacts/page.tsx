import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactsClient } from './contacts-client';
import type { Contact } from '@/modules/inventory/validations/contact';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ContactsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: contacts } = await tenantClient
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  const items = (contacts ?? []) as Contact[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Contacts
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Manage suppliers, customers, and contact information
          </p>
        </div>
        <ContactsClient
          contacts={items}
          tenantSlug={tenantSlug}
          renderMode="button"
        />
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            All Contacts ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ContactsClient
            contacts={items}
            tenantSlug={tenantSlug}
            renderMode="table"
          />
        </CardContent>
      </Card>
    </div>
  );
}
