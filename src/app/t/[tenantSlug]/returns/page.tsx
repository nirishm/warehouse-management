import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { listReturns } from '@/modules/returns/queries/returns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReturnsTable } from './returns-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ReturnsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'returns', permission: 'canManageReturns' });
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('returns')) redirect(`/t/${tenantSlug}`);

  const { data: returns, total: returnsTotal } = await listReturns(tenant.schema_name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-serif">Returns</h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">Purchase and sale return management</p>
        </div>
        <Link prefetch={false} href={`/t/${tenantSlug}/returns/new`}>
          <Button variant="orange">New Return</Button>
        </Link>
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Returns ({returnsTotal})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No returns found</p>
              <p className="text-xs mt-1">Create your first return to get started</p>
            </div>
          ) : (
            <ReturnsTable data={returns} tenantSlug={tenantSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
