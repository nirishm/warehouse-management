'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItemForm } from './item-form';
import type { Commodity } from './items-table';

interface ItemActionsProps {
  item: Commodity;
  tenantSlug: string;
}

export function ItemActions({ item, tenantSlug }: ItemActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleToggleActive() {
    setLoading(true);
    try {
      await fetch(`/api/t/${tenantSlug}/commodities/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/t/${tenantSlug}/commodities/${item.id}`, {
        method: 'DELETE',
      });
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setOpen(!open)}
        disabled={loading}
      >
        <MoreHorizontal size={16} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-border bg-[var(--bg-base)] shadow-lg p-1">
            <ItemForm
              tenantSlug={tenantSlug}
              item={item}
              trigger={
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--bg-off)] text-[var(--text-body)] flex items-center gap-2"
                  onClick={() => setOpen(false)}
                >
                  <Pencil size={14} />
                  Edit
                </button>
              }
            />

            <button
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--bg-off)] text-[var(--text-body)] flex items-center gap-2"
              onClick={handleToggleActive}
              disabled={loading}
            >
              <Power size={14} />
              {item.is_active ? 'Deactivate' : 'Activate'}
            </button>

            <button
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--bg-off)] text-[var(--red)] flex items-center gap-2"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
