'use client';

import { type ReactElement, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus, Loader2 } from 'lucide-react';
import type { Location, LocationType } from '@/modules/inventory/validations/location';

interface LocationFormProps {
  tenantSlug: string;
  location?: Location;
  trigger?: ReactElement;
}

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'store', label: 'Store' },
  { value: 'yard', label: 'Yard' },
  { value: 'external', label: 'External' },
];

export function LocationForm({ tenantSlug, location, trigger }: LocationFormProps) {
  const router = useRouter();
  const isEditing = !!location;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(location?.name ?? '');
  const [code, setCode] = useState(location?.code ?? '');
  const [type, setType] = useState<LocationType>(location?.type ?? 'warehouse');
  const [address, setAddress] = useState(location?.address ?? '');

  function resetForm() {
    if (!isEditing) {
      setName('');
      setCode('');
      setType('warehouse');
      setAddress('');
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name,
      code: code.toUpperCase(),
      type,
      ...(address ? { address } : {}),
    };

    try {
      const url = isEditing
        ? `/api/t/${tenantSlug}/locations/${location.id}`
        : `/api/t/${tenantSlug}/locations`;

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save location');
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          // Reset to location values when opening in edit mode
          if (isEditing && location) {
            setName(location.name);
            setCode(location.code);
            setType(location.type);
            setAddress(location.address ?? '');
          }
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button className="bg-amber-600 text-zinc-950 hover:bg-amber-500 font-medium">
              <Plus className="size-4 mr-1" />
              New Location
            </Button>
          )
        }
      />
      <DialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 font-semibold">
            {isEditing ? 'Edit Location' : 'New Location'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isEditing
              ? 'Update the location details below.'
              : 'Add a new warehouse, store, yard, or external location.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="loc-name" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Name
            </Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main Warehouse"
              required
              className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-code" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Code
            </Label>
            <Input
              id="loc-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WH-MAIN"
              required
              pattern="^[A-Z0-9-]+$"
              className="bg-zinc-950 border-zinc-700 text-amber-500 font-mono placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
            />
            <p className="text-xs text-zinc-600">
              Uppercase letters, numbers, and dashes only
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Type
            </Label>
            <Select value={type} onValueChange={(val) => setType(val as LocationType)}>
              <SelectTrigger className="w-full bg-zinc-950 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {LOCATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-zinc-200 focus:bg-zinc-800">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-address" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Address
              <span className="text-zinc-600 normal-case font-sans ml-1">(optional)</span>
            </Label>
            <Textarea
              id="loc-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Warehouse St, City, State"
              rows={2}
              className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
            />
          </div>

          <DialogFooter className="bg-zinc-950/50 border-zinc-800">
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500 font-medium"
            >
              {loading && <Loader2 className="size-4 mr-1 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
