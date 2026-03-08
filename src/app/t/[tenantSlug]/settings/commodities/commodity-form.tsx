'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useTenant } from '@/components/layout/tenant-provider';

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

interface CommodityFormData {
  id?: string;
  name: string;
  code: string;
  description: string;
  category: string;
  default_unit_id: string;
}

interface CommodityFormProps {
  commodity?: CommodityFormData | null;
  onSuccess: () => void;
  trigger?: React.ReactElement;
}

export function CommodityForm({ commodity, onSuccess, trigger }: CommodityFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const ctx = useTenant();

  const [form, setForm] = useState<CommodityFormData>({
    name: '',
    code: '',
    description: '',
    category: '',
    default_unit_id: '',
  });

  const isEdit = !!commodity?.id;

  useEffect(() => {
    if (open) {
      fetchUnits();
      if (commodity) {
        setForm({
          name: commodity.name ?? '',
          code: commodity.code ?? '',
          description: commodity.description ?? '',
          category: commodity.category ?? '',
          default_unit_id: commodity.default_unit_id ?? '',
        });
      } else {
        setForm({ name: '', code: '', description: '', category: '', default_unit_id: '' });
      }
      setError(null);
    }
  }, [open, commodity]);

  async function fetchUnits() {
    try {
      const res = await fetch(`/api/t/${ctx.tenantId}/units`, {
        headers: {
          'x-tenant-id': ctx.tenantId,
          'x-tenant-schema': ctx.schemaName,
          'x-tenant-role': ctx.role,
          'x-tenant-modules': JSON.stringify(ctx.enabledModules),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUnits(data);
      }
    } catch {
      // Units are optional; silently handle
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name,
      code: form.code,
    };
    if (form.description) payload.description = form.description;
    if (form.category) payload.category = form.category;
    if (form.default_unit_id) payload.default_unit_id = form.default_unit_id;

    try {
      const url = isEdit
        ? `/api/t/${ctx.tenantId}/commodities/${commodity!.id}`
        : `/api/t/${ctx.tenantId}/commodities`;

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': ctx.tenantId,
          'x-tenant-schema': ctx.schemaName,
          'x-tenant-role': ctx.role,
          'x-tenant-modules': JSON.stringify(ctx.enabledModules),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Request failed');
      }

      setOpen(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button className="bg-[var(--accent-color)] text-foreground hover:bg-[var(--accent-color)]">
              <Plus className="size-4 mr-1" />
              New Commodity
            </Button>
          )
        }
      />
      <DialogContent className="bg-background border border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground font-mono uppercase tracking-wider text-sm">
            {isEdit ? 'Edit Commodity' : 'New Commodity'}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-dim)] text-xs">
            {isEdit
              ? 'Update the commodity details below.'
              : 'Add a new commodity to your inventory.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-[var(--red)]/50 bg-[var(--red-bg)] px-3 py-2 text-sm text-[var(--red)]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="commodity-name" className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-wider">
                Name
              </Label>
              <Input
                id="commodity-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Wheat Grain"
                required
                className="border-border bg-[var(--bg-off)] text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commodity-code" className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-wider">
                Code
              </Label>
              <Input
                id="commodity-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="WHT-001"
                required
                pattern="^[A-Z0-9-]+$"
                className="border-border bg-[var(--bg-off)] text-foreground font-mono placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commodity-category" className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-wider">
              Category
            </Label>
            <Input
              id="commodity-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Grains"
              className="border-border bg-[var(--bg-off)] text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commodity-unit" className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-wider">
              Default Unit
            </Label>
            <Select
              value={form.default_unit_id || undefined}
              onValueChange={(val) => setForm({ ...form, default_unit_id: val as string })}
            >
              <SelectTrigger className="w-full border-border bg-[var(--bg-off)] text-foreground">
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id} className="text-foreground">
                    {unit.name} ({unit.abbreviation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commodity-description" className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-wider">
              Description
            </Label>
            <Textarea
              id="commodity-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
              className="border-border bg-[var(--bg-off)] text-foreground placeholder:text-muted-foreground min-h-[60px]"
            />
          </div>

          <DialogFooter className="border-border bg-[var(--bg-off)]">
            <Button
              type="submit"
              disabled={loading}
              className="bg-[var(--accent-color)] text-foreground hover:bg-[var(--accent-color)] disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
