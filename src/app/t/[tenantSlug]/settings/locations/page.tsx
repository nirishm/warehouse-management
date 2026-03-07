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
    warehouse: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    store: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    yard: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    external: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Locations
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage warehouses, stores, yards, and external locations
          </p>
        </div>
        <LocationForm tenantSlug={tenantSlug} />
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            All Locations ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-sm font-mono">No locations found</p>
              <p className="text-xs mt-1">
                Create your first location to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                    Code
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((location) => (
                  <TableRow
                    key={location.id}
                    className="border-zinc-800/60 hover:bg-zinc-800/30"
                  >
                    <TableCell className="pl-6 font-mono text-sm text-amber-500 font-medium">
                      {location.code}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-200">
                      {location.name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${typeColors[location.type] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'}`}
                      >
                        {location.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={location.is_active ? 'default' : 'secondary'}
                        className={
                          location.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/50'
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
