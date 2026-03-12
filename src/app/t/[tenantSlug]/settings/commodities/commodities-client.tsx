'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CommodityForm } from './commodity-form';
import { CommodityActions } from './commodity-actions';

interface CommodityRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  default_unit_id: string | null;
  is_active: boolean;
  unit_name: string | null;
  unit_abbreviation: string | null;
}

interface CommoditiesClientProps {
  initialData: CommodityRow[];
  renderMode: 'button' | 'table';
  tenantSlug?: string;
  barcodeEnabled?: boolean;
}

export function CommoditiesClient({
  initialData,
  renderMode,
  tenantSlug,
  barcodeEnabled,
}: CommoditiesClientProps) {
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  if (renderMode === 'button') {
    return <CommodityForm onSuccess={refresh} />;
  }

  if (initialData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-[var(--text-dim)] font-mono">No items found</p>
        <p className="text-xs text-[var(--text-dim)] mt-1">
          Create your first item to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">
            Code
          </TableHead>
          <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">
            Name
          </TableHead>
          <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">
            Category
          </TableHead>
          <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">
            Default Unit
          </TableHead>
          <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">
            Status
          </TableHead>
          <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {initialData.map((commodity) => (
          <TableRow key={commodity.id} className="border-border hover:bg-[var(--bg-off)]">
            <TableCell className="font-mono text-[var(--accent-color)] text-sm">
              {commodity.code}
            </TableCell>
            <TableCell className="text-foreground text-sm font-medium">
              {commodity.name}
            </TableCell>
            <TableCell className="text-[var(--text-muted)] text-sm">
              {commodity.category ?? <span className="text-[var(--text-dim)]">--</span>}
            </TableCell>
            <TableCell className="text-[var(--text-muted)] text-sm">
              {commodity.unit_name ? (
                <span className="font-mono text-xs">
                  {commodity.unit_name}{' '}
                  <span className="text-[var(--text-dim)]">({commodity.unit_abbreviation})</span>
                </span>
              ) : (
                <span className="text-[var(--text-dim)]">--</span>
              )}
            </TableCell>
            <TableCell>
              {commodity.is_active ? (
                <Badge className="bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20 text-xs font-mono">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-mono text-[var(--text-dim)]">
                  Inactive
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-3">
                {barcodeEnabled && tenantSlug && (
                  <a
                    href={`/api/t/${tenantSlug}/barcodes/${commodity.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-[var(--accent-color)] hover:text-[var(--accent-dark)] underline underline-offset-2"
                  >
                    QR
                  </a>
                )}
                <CommodityActions commodity={commodity} onSuccess={refresh} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
