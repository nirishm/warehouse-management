'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { CustomFieldForm } from './custom-field-form';

export interface CustomField {
  id: string;
  entity_type: string;
  field_key: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface Props {
  tenantSlug: string;
}

const entityLabels: Record<string, string> = {
  dispatch: 'Dispatches',
  purchase: 'Purchases',
  sale: 'Sales',
  commodity: 'Items',
  location: 'Locations',
  contact: 'Contacts',
  dispatch_item: 'Dispatch Items',
  purchase_item: 'Purchase Items',
  sale_item: 'Sale Items',
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: 'bg-muted/60 text-[var(--text-muted)] border border-[var(--border)]',
  number: 'bg-[var(--blue-bg)] text-[var(--blue)] border border-[var(--blue)]/20',
  date: 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20',
  boolean: 'bg-[var(--orange-bg)] text-[var(--accent-color)] border border-[var(--accent-color)]/20',
  select: 'bg-[var(--accent-tint)] text-[var(--accent-color)] border border-[var(--accent-color)]/20',
  multiselect: 'bg-[var(--accent-tint)] text-[var(--accent-color)] border border-[var(--accent-color)]/20',
};

export function CustomFieldsPage({ tenantSlug }: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch(`/api/t/${tenantSlug}/custom-fields`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setFields(json.data ?? []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  async function handleDelete(field: CustomField) {
    if (!confirm(`Delete custom field "${field.field_label}"? Existing data in records will remain.`)) {
      return;
    }
    setDeleting(field.id);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/custom-fields/${field.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      await fetchFields();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeleting(null);
    }
  }

  // Group fields by entity_type
  const grouped = fields.reduce<Record<string, CustomField[]>>((acc, f) => {
    if (!acc[f.entity_type]) acc[f.entity_type] = [];
    acc[f.entity_type].push(f);
    return acc;
  }, {});

  const entityTypes = Object.keys(grouped);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Custom Fields
            </h1>
            <p className="text-sm text-[var(--text-dim)] mt-1">
              Define custom fields for your entities to capture additional data
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16 text-[var(--text-dim)]">
          <Loader2 className="size-5 animate-spin mr-2" />
          <span className="text-sm">Loading fields...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Custom Fields
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Define custom fields for your entities to capture additional data
          </p>
        </div>
        <CustomFieldForm tenantSlug={tenantSlug} onSaved={fetchFields} />
      </div>

      {fields.length === 0 ? (
        <Card className="border-border bg-[var(--bg-base)]">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-[var(--text-dim)]">
              <p className="text-sm">No custom fields defined</p>
              <p className="text-xs mt-1">
                Create your first custom field to extend your entities
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        entityTypes.map((entityType) => (
          <Card key={entityType} className="border-border bg-[var(--bg-base)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
                {entityLabels[entityType] ?? entityType} ({grouped[entityType].length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border)]">
                {grouped[entityType].map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-4 px-6 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {field.field_label}
                        </span>
                        <code className="text-xs font-mono text-[var(--text-muted)]">
                          {field.field_key}
                        </code>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono ${
                        FIELD_TYPE_COLORS[field.field_type] ??
                        'bg-muted/50 text-[var(--text-muted)] border border-border'
                      }`}
                    >
                      {field.field_type}
                    </span>

                    {field.is_required && (
                      <Badge
                        variant="secondary"
                        className="bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20 rounded-full text-xs"
                      >
                        Required
                      </Badge>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      <CustomFieldForm
                        tenantSlug={tenantSlug}
                        field={field}
                        onSaved={fetchFields}
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
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={deleting === field.id}
                        onClick={() => handleDelete(field)}
                        className="text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-muted"
                      >
                        {deleting === field.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
