import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LocationForm } from './location-form';
import { LocationActions } from './location-actions';
import type { Location } from '@/modules/inventory/validations/location';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LocationsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, permission: 'canManageLocations' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: locations } = await tenantClient
    .from('locations')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  const items = (locations ?? []) as Location[];

  const typeColors: Record<string, string> = {
    warehouse: 'bg-[var(--accent-color)]/15 text-[var(--accent-color)] border-[var(--accent-color)]/30',
    store: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30',
    yard: 'bg-[var(--blue-bg)] text-[var(--blue)] border-[rgba(37,99,235,0.2)]',
    external: 'bg-[var(--orange-bg)] text-[var(--accent-color)] border-[rgba(244,95,0,0.2)]',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
            Locations
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Manage warehouses, stores, yards, and external locations
          </p>
        </div>
        <LocationForm tenantSlug={tenantSlug} />
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            All Locations ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-dim)]">
              <p className="text-sm font-mono">No locations found</p>
              <p className="text-xs mt-1">
                Create your first location to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] pl-6">
                    Code
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((location) => (
                  <TableRow
                    key={location.id}
                    className="border-border hover:bg-muted/50"
                  >
                    <TableCell className="pl-6 font-mono text-sm text-[var(--accent-color)] font-medium">
                      {location.code}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {location.name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${typeColors[location.type] ?? 'bg-muted/50 text-[var(--text-muted)] border-border'}`}
                      >
                        {location.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={location.is_active ? 'default' : 'secondary'}
                        className={
                          location.is_active
                            ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                            : 'bg-muted text-[var(--text-muted)] border border-border'
                        }
                      >
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <LocationActions
                        location={location}
                        tenantSlug={tenantSlug}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
