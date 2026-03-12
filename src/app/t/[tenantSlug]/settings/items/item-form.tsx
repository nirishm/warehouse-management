'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Commodity } from './items-table';

interface ItemFormProps {
  tenantSlug: string;
  item?: Commodity;
  trigger?: React.ReactElement;
}

export function ItemForm({ tenantSlug, item, trigger }: ItemFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [description, setDescription] = useState(item?.description ?? '');

  function resetForm() {
    if (!isEdit) {
      setName('');
      setCode('');
      setCategory('');
      setDescription('');
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, string> = {
        name,
        code: code.toUpperCase(),
      };
      if (category) body.category = category;
      if (description) body.description = description;

      const url = isEdit
        ? `/api/t/${tenantSlug}/commodities/${item.id}`
        : `/api/t/${tenantSlug}/commodities`;

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed to ${isEdit ? 'update' : 'create'} item`);
      }

      router.refresh();
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const triggerElement = trigger ?? (
    <Button variant="orange">
      <Plus size={16} /> New Item
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={triggerElement}
        onClick={() => {
          if (isEdit) {
            setName(item.name);
            setCode(item.code);
            setCategory(item.category ?? '');
            setDescription(item.description ?? '');
          }
        }}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold">{isEdit ? 'Edit Item' : 'New Item'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update item details.' : 'Add a new item to your inventory.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-[var(--red)]/30 bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
              Name <span className="text-[var(--red)]">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Steel Rod"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
              Code <span className="text-[var(--red)]">*</span>
            </Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. STL-ROD"
              required
              className="uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
              Category
            </Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Raw Materials"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
              Description
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/50 resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="submit" variant="orange" disabled={loading}>
              {loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Item')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
