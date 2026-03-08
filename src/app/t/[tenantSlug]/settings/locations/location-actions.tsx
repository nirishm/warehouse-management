'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { LocationForm } from './location-form';
import type { Location } from '@/modules/inventory/validations/location';

interface LocationActionsProps {
  location: Location;
  tenantSlug: string;
}

export function LocationActions({ location, tenantSlug }: LocationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    try {
      await fetch(`/api/t/${tenantSlug}/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !location.is_active }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${location.name}"? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/t/${tenantSlug}/locations/${location.id}`, {
        method: 'DELETE',
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <LocationForm
        tenantSlug={tenantSlug}
        location={location}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-[var(--text-muted)] hover:text-foreground hover:bg-muted"
          >
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
              disabled={loading}
              className="text-[var(--text-muted)] hover:text-foreground hover:bg-muted"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="bg-[var(--bg-off)] border-border min-w-[160px]"
        >
          <DropdownMenuItem
            onClick={toggleActive}
            className="text-[var(--text-body)] focus:bg-muted focus:text-foreground gap-2"
          >
            {location.is_active ? (
              <>
                <PowerOff className="size-3.5" />
                Deactivate
              </>
            ) : (
              <>
                <Power className="size-3.5" />
                Activate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-muted" />
          <DropdownMenuItem
            onClick={handleDelete}
            variant="destructive"
            className="gap-2"
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
