import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listReturns } from '@/modules/returns/queries/returns';
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
import { Button } from '@/components/ui/button';
import type { ReturnStatus, ReturnType } from '@/modules/returns/validations/return';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

const statusColors: Record<ReturnStatus, string> = {
  draft: 'bg-[var(--bg-off)] text-[var(--text-muted)] border border-[var(--border)]',
  confirmed: 'bg-[var(--green-bg)] text-[var(--green)] border border-[rgba(22,163,74,0.2)]',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border border-[rgba(220,38,38,0.2)]',
};

const typeLabels: Record<ReturnType, string> = {
  purchase_return: 'Purchase Return',
  sale_return: 'Sale Return',
};

export default async function ReturnsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'returns', permission: 'canManageReturns' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('returns')) redirect(`/t/${tenantSlug}`);

  const returns = await listReturns(tenant.schema_name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-serif">Returns</h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">Purchase and sale return management</p>
        </div>
        <Link href={`/t/${tenantSlug}/returns/new`}>
          <Button variant="orange">New Return</Button>
        </Link>
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Returns ({returns.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No returns found</p>
              <p className="text-xs mt-1">Create your first return to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground pl-6">
                    Return #
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Location
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Contact
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground pr-6">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => (
                  <TableRow key={ret.id} className="border-border hover:bg-muted/50">
                    <TableCell className="pl-6">
                      <Link
                        href={`/t/${tenantSlug}/returns/${ret.id}`}
                        className="font-mono text-[var(--accent-color)] hover:text-[var(--accent-color)]/80 text-sm font-medium"
                      >
                        {ret.return_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {typeLabels[ret.return_type]}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-body)]">
                      {ret.location?.name ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {ret.contact?.name ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono">
                      {new Date(ret.return_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="pr-6">
                      <Badge className={statusColors[ret.status]}>{ret.status}</Badge>
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
