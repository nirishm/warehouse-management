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
        className="text-xs font-mono uppercase tracking-wider text-zinc-400"
      >
        {field_label}
        {is_required && <span className="text-amber-500 ml-1">*</span>}
      </Label>

      {field_type === 'text' && (
        <Input
          id={inputId}
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={is_required}
          className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
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
          className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
      )}

      {field_type === 'date' && (
        <Input
          id={inputId}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          required={is_required}
          className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
      )}

      {field_type === 'boolean' && (
        <div className="flex items-center gap-2 pt-1">
          <input
            id={inputId}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 rounded border-zinc-700 bg-zinc-950 text-amber-600 focus:ring-amber-500/20 accent-amber-600"
          />
          <Label
            htmlFor={inputId}
            className="text-sm text-zinc-300 cursor-pointer font-normal normal-case tracking-normal"
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
          <SelectTrigger className="w-full bg-zinc-950 border-zinc-700 text-zinc-100">
            <SelectValue placeholder={`Select ${field_label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {(options ?? []).map((opt) => (
              <SelectItem
                key={opt}
                value={opt}
                className="text-zinc-200 focus:bg-zinc-800"
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
                  className="size-4 rounded border-zinc-700 bg-zinc-950 text-amber-600 focus:ring-amber-500/20 accent-amber-600"
                />
                <span className="text-sm text-zinc-300">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
