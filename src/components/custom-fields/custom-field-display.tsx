import type { CustomFieldDefinition } from '@/modules/inventory/validations/custom-field';

interface CustomFieldDisplayProps {
  definition: CustomFieldDefinition;
  value: unknown;
}

export function CustomFieldDisplay({
  definition,
  value,
}: CustomFieldDisplayProps) {
  const { field_type, field_label } = definition;

  function renderValue(): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    switch (field_type) {
      case 'text':
        return String(value);

      case 'number':
        return String(value);

      case 'date':
        try {
          return new Date(value as string).toLocaleDateString();
        } catch {
          return String(value);
        }

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'select':
        return String(value);

      case 'multiselect':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);

      default:
        return String(value);
    }
  }

  return (
    <div className="space-y-1">
      <dt className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
        {field_label}
      </dt>
      <dd className="text-sm text-foreground">{renderValue()}</dd>
    </div>
  );
}
