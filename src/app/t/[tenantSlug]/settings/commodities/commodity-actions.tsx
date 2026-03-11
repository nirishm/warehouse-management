'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTenant } from '@/components/layout/tenant-provider';
import { CommodityForm } from './commodity-form';

interface CommodityRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  default_unit_id: string | null;
}

interface CommodityActionsProps {
  commodity: CommodityRow;
  onSuccess: () => void;
}

export function CommodityActions({ commodity, onSuccess }: CommodityActionsProps) {
  const [deleting, setDeleting] = useState(false);
  const ctx = useTenant();

  async function handleDelete() {
    if (!confirm(`Delete item "${commodity.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/t/${ctx.tenantSlug}/commodities/${commodity.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Delete failed');
      }

      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  }

  const formData = {
    id: commodity.id,
    name: commodity.name,
    code: commodity.code,
    description: commodity.description ?? '',
    category: commodity.category ?? '',
    default_unit_id: commodity.default_unit_id ?? '',
    hsn_code: ((commodity as unknown as Record<string, unknown>).hsn_code as string) ?? '',
    tax_rate: String((commodity as unknown as Record<string, unknown>).tax_rate ?? ''),
  };

  return (
    <div className="flex items-center gap-1">
      <CommodityForm
        commodity={formData}
        onSuccess={onSuccess}
        trigger={
          <Button variant="ghost" size="icon-sm" className="text-[var(--text-muted)] hover:text-foreground">
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={deleting}
              className="text-[var(--text-muted)] hover:text-foreground"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background border-border">
          <DropdownMenuItem
            className="text-[var(--text-body)] focus:text-foreground"
            onSelect={() => {
              // The edit trigger button handles this
            }}
          >
            <Pencil className="size-3.5 mr-1.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-muted" />
          <DropdownMenuItem
            variant="destructive"
            onSelect={handleDelete}
          >
            <Trash2 className="size-3.5 mr-1.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
