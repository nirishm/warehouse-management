'use client';

import { type ReactElement, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  ENTITY_TYPES,
  FIELD_TYPES,
  type CustomFieldDefinition,
  type EntityType,
  type FieldType,
} from '@/modules/inventory/validations/custom-field';

interface CustomFieldFormProps {
  tenantSlug: string;
  definition?: CustomFieldDefinition;
  trigger?: ReactElement;
}

const ENTITY_LABELS: Record<string, string> = {
  dispatch: 'Dispatch',
  purchase: 'Purchase',
  sale: 'Sale',
  commodity: 'Commodity',
  location: 'Location',
  contact: 'Contact',
  dispatch_item: 'Dispatch Item',
  purchase_item: 'Purchase Item',
  sale_item: 'Sale Item',
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  boolean: 'Boolean',
  select: 'Select (dropdown)',
  multiselect: 'Multi-select',
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function CustomFieldForm({
  tenantSlug,
  definition,
  trigger,
}: CustomFieldFormProps) {
  const router = useRouter();
  const isEditing = !!definition;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entityType, setEntityType] = useState<EntityType>(
    definition?.entity_type ?? 'dispatch'
  );
  const [fieldKey, setFieldKey] = useState(definition?.field_key ?? '');
  const [fieldLabel, setFieldLabel] = useState(definition?.field_label ?? '');
  const [fieldType, setFieldType] = useState<FieldType>(
    definition?.field_type ?? 'text'
  );
  const [optionsText, setOptionsText] = useState(
    definition?.options?.join(', ') ?? ''
  );
  const [isRequired, setIsRequired] = useState(
    definition?.is_required ?? false
  );
  const [sortOrder, setSortOrder] = useState(definition?.sort_order ?? 0);

  // Auto-generate field_key from label when creating
  const [autoKey, setAutoKey] = useState(!isEditing);

  useEffect(() => {
    if (autoKey && !isEditing) {
      setFieldKey(slugify(fieldLabel));
    }
  }, [fieldLabel, autoKey, isEditing]);

  const showOptions = fieldType === 'select' || fieldType === 'multiselect';

  function resetForm() {
    if (!isEditing) {
      setEntityType('dispatch');
      setFieldKey('');
      setFieldLabel('');
      setFieldType('text');
      setOptionsText('');
      setIsRequired(false);
      setSortOrder(0);
      setAutoKey(true);
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const options = showOptions
      ? optionsText
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;

    const payload = {
      entity_type: entityType,
      field_key: fieldKey,
      field_label: fieldLabel,
      field_type: fieldType,
      ...(options ? { options } : {}),
      is_required: isRequired,
      sort_order: sortOrder,
    };

    try {
      const url = isEditing
        ? `/api/t/${tenantSlug}/custom-fields/${definition.id}`
        : `/api/t/${tenantSlug}/custom-fields`;

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save custom field');
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
        if (nextOpen && isEditing && definition) {
          setEntityType(definition.entity_type);
          setFieldKey(definition.field_key);
          setFieldLabel(definition.field_label);
          setFieldType(definition.field_type);
          setOptionsText(definition.options?.join(', ') ?? '');
          setIsRequired(definition.is_required);
          setSortOrder(definition.sort_order);
          setAutoKey(false);
        }
        if (nextOpen && !isEditing) {
          resetForm();
        }
        if (!nextOpen) {
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button className="bg-amber-600 text-zinc-950 hover:bg-amber-500 font-medium">
              <Plus className="size-4 mr-1" />
              New Custom Field
            </Button>
          )
        }
      />
      <DialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 font-semibold">
            {isEditing ? 'Edit Custom Field' : 'New Custom Field'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isEditing
              ? 'Update the custom field definition.'
              : 'Define a new custom field for an entity type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Entity Type
            </Label>
            <Select
              value={entityType}
              onValueChange={(val) => setEntityType(val as EntityType)}
            >
              <SelectTrigger className="w-full bg-zinc-950 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {ENTITY_TYPES.map((et) => (
                  <SelectItem
                    key={et}
                    value={et}
                    className="text-zinc-200 focus:bg-zinc-800"
                  >
                    {ENTITY_LABELS[et] ?? et}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="cf-label"
              className="text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Field Label
            </Label>
            <Input
              id="cf-label"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="e.g. Batch Number"
              required
              className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="cf-key"
              className="text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Field Key
            </Label>
            <Input
              id="cf-key"
              value={fieldKey}
              onChange={(e) => {
                setFieldKey(e.target.value);
                setAutoKey(false);
              }}
              placeholder="e.g. batch_number"
              required
              pattern="^[a-z0-9_]+$"
              className="bg-zinc-950 border-zinc-700 text-amber-500 font-mono placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
            />
            <p className="text-xs text-zinc-600">
              Lowercase letters, numbers, and underscores only
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Field Type
            </Label>
            <Select
              value={fieldType}
              onValueChange={(val) => setFieldType(val as FieldType)}
            >
              <SelectTrigger className="w-full bg-zinc-950 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {FIELD_TYPES.map((ft) => (
                  <SelectItem
                    key={ft}
                    value={ft}
                    className="text-zinc-200 focus:bg-zinc-800"
                  >
                    {FIELD_TYPE_LABELS[ft] ?? ft}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showOptions && (
            <div className="space-y-2">
              <Label
                htmlFor="cf-options"
                className="text-xs font-mono uppercase tracking-wider text-zinc-400"
              >
                Options
              </Label>
              <Input
                id="cf-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Option A, Option B, Option C"
                required
                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
              />
              <p className="text-xs text-zinc-600">
                Comma-separated list of options
              </p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cf-required"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="size-4 rounded border-zinc-700 bg-zinc-950 text-amber-600 focus:ring-amber-500/20 accent-amber-600"
              />
              <Label
                htmlFor="cf-required"
                className="text-xs font-mono uppercase tracking-wider text-zinc-400 cursor-pointer"
              >
                Required
              </Label>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Label
                htmlFor="cf-sort"
                className="text-xs font-mono uppercase tracking-wider text-zinc-400"
              >
                Sort Order
              </Label>
              <Input
                id="cf-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-20 bg-zinc-950 border-zinc-700 text-zinc-100 font-mono focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
              />
            </div>
          </div>

          <DialogFooter className="bg-zinc-950/50 border-zinc-800">
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500 font-medium"
            >
              {loading && <Loader2 className="size-4 mr-1 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Field'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
