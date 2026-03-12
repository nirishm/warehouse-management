'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { LocationForm } from './location-form';

interface Location {
  id: string;
  name: string;
  code: string;
  type: 'warehouse' | 'store' | 'yard' | 'external';
  address: string | null;
  is_active: boolean;
}

interface LocationActionsProps {
  location: Location;
  tenantSlug: string;
}

export function LocationActions({ location, tenantSlug }: LocationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function toggleActive() {
    setLoading(true);
    setOpen(false);
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
    setOpen(false);
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
    <div className="flex items-center justify-end gap-1" ref={menuRef}>
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

      <div className="relative">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={loading}
          onClick={() => setOpen(!open)}
          className="text-[var(--text-muted)] hover:text-foreground hover:bg-muted"
        >
          <MoreHorizontal className="size-3.5" />
        </Button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-white shadow-lg py-1">
            <button
              onClick={toggleActive}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--bg-off)]"
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
            </button>
            <div className="mx-2 my-1 border-t border-border" />
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--red)] hover:bg-[var(--red-bg)]"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
