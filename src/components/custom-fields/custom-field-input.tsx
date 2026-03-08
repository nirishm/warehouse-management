'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CustomFieldDefinition } from '@/modules/inventory/validations/custom-field';

interface CustomFieldInputProps {
  definition: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function CustomFieldInput({
  definition,
  value,
  onChange,
}: CustomFieldInputProps) {
  const { field_type, field_label, field_key, is_required, options } =
    definition;

  const inputId = `cf-${field_key}`;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={inputId}
        className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]"
      >
        {field_label}
        {is_required && <span className="text-[var(--accent)] ml-1">*</span>}
      </Label>

      {field_type === 'text' && (
        <Input
          id={inputId}
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={is_required}
          className=""
        />
      )}

      {field_type === 'number' && (
        <Input
          id={inputId}
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Number(e.target.value))
          }
          required={is_required}
          className=""
        />
      )}

      {field_type === 'date' && (
        <Input
          id={inputId}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          required={is_required}
          className=""
        />
      )}

      {field_type === 'boolean' && (
        <div className="flex items-center gap-2 pt-1">
          <input
            id={inputId}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 rounded border-border bg-white text-[var(--accent)] focus:ring-[var(--accent)]/20 accent-[var(--accent)]"
          />
          <Label
            htmlFor={inputId}
            className="text-sm text-[var(--text-body)] cursor-pointer font-normal normal-case tracking-normal"
          >
            {field_label}
          </Label>
        </div>
      )}

      {field_type === 'select' && (
        <Select
          value={(value as string) ?? ''}
          onValueChange={(val) => onChange(val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${field_label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {(options ?? []).map((opt) => (
              <SelectItem
                key={opt}
                value={opt}
                className=""
              >
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field_type === 'multiselect' && (
        <div className="flex flex-wrap gap-3 pt-1">
          {(options ?? []).map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? [...value] : [];
                    if (e.target.checked) {
                      current.push(opt);
                    } else {
                      const idx = current.indexOf(opt);
                      if (idx >= 0) current.splice(idx, 1);
                    }
                    onChange(current);
                  }}
                  className="size-4 rounded border-border bg-white text-[var(--accent)] focus:ring-[var(--accent)]/20 accent-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text-body)]">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
