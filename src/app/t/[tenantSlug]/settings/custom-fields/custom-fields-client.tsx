'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import type { CustomFieldDefinition } from '@/modules/inventory/validations/custom-field';
import { CustomFieldForm } from './custom-field-form';

interface CustomFieldsClientProps {
  definitions: CustomFieldDefinition[];
  tenantSlug: string;
}

const ENTITY_LABELS: Record<string, string> = {
  dispatch: 'Dispatches',
  purchase: 'Purchases',
  sale: 'Sales',
  commodity: 'Commodities',
  location: 'Locations',
  contact: 'Contacts',
  dispatch_item: 'Dispatch Items',
  purchase_item: 'Purchase Items',
  sale_item: 'Sale Items',
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: 'bg-[var(--blue-bg)] text-[var(--blue)] border-[rgba(37,99,235,0.2)]',
  number: 'bg-[var(--orange-bg)] text-[var(--accent-color)] border-[rgba(244,95,0,0.2)]',
  date: 'bg-[var(--green-bg)] text-[var(--green)] border-[rgba(22,163,74,0.2)]',
  boolean: 'bg-[var(--orange-bg)] text-[var(--accent-color)] border-[rgba(244,95,0,0.2)]',
  select: 'bg-[var(--red-bg)] text-[var(--red)] border-[rgba(220,38,38,0.2)]',
  multiselect: 'bg-[var(--red-bg)] text-[var(--red)] border-[rgba(220,38,38,0.2)]',
};

export function CustomFieldsClient({
  definitions,
  tenantSlug,
}: CustomFieldsClientProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  // Group definitions by entity_type
  const grouped = definitions.reduce<Record<string, CustomFieldDefinition[]>>(
    (acc, def) => {
      if (!acc[def.entity_type]) acc[def.entity_type] = [];
      acc[def.entity_type].push(def);
      return acc;
    },
    {}
  );

  async function handleDelete(definition: CustomFieldDefinition) {
    if (
      !confirm(
        `Delete custom field "${definition.field_label}"? This will remove the field definition but existing data in records will remain.`
      )
    )
      return;

    setDeleting(definition.id);
    try {
      const res = await fetch(
        `/api/t/${tenantSlug}/custom-fields/${definition.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeleting(null);
    }
  }

  const entityTypes = Object.keys(grouped);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
            Custom Fields
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Define custom fields for your entities to capture additional data
          </p>
        </div>
        <CustomFieldForm tenantSlug={tenantSlug} />
      </div>

      {definitions.length === 0 ? (
        <Card className="border-border bg-[var(--bg-off)]">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-[var(--text-dim)]">
              <p className="text-sm font-mono">No custom fields defined</p>
              <p className="text-xs mt-1">
                Create your first custom field to extend your entities
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        entityTypes.map((entityType) => (
          <Card key={entityType} className="border-border bg-[var(--bg-off)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                {ENTITY_LABELS[entityType] ?? entityType} (
                {grouped[entityType].length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] pl-6">
                      Label
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                      Key
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                      Required
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                      Order
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] text-right pr-6">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped[entityType].map((definition) => (
                    <TableRow
                      key={definition.id}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell className="pl-6 text-sm text-foreground font-medium">
                        {definition.field_label}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--accent-color)]">
                        {definition.field_key}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${
                            FIELD_TYPE_COLORS[definition.field_type] ??
                            'bg-muted/50 text-[var(--text-muted)] border-border'
                          }`}
                        >
                          {definition.field_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            definition.is_required ? 'default' : 'secondary'
                          }
                          className={
                            definition.is_required
                              ? 'bg-[var(--accent-color)]/15 text-[var(--accent-color)] border border-[var(--accent-color)]/30'
                              : 'bg-muted text-[var(--text-muted)] border border-border'
                          }
                        >
                          {definition.is_required ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-muted)] font-mono">
                        {definition.sort_order}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <CustomFieldForm
                            tenantSlug={tenantSlug}
                            definition={definition}
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
                            disabled={deleting === definition.id}
                            onClick={() => handleDelete(definition)}
                            className="text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-muted"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
