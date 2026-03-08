'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LotNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LotNumberInput({
  value,
  onChange,
  label = 'Lot Number',
  placeholder = 'Auto-generated if empty',
  disabled,
}: LotNumberInputProps) {
  const [manual, setManual] = useState(!!value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[var(--text-muted)] text-xs">{label}</Label>
        <button
          type="button"
          onClick={() => {
            setManual((m) => !m);
            if (manual) onChange('');
          }}
          className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text-body)] transition-colors"
        >
          {manual ? 'Auto-generate' : 'Enter manually'}
        </button>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={manual ? 'LOT-000001' : placeholder}
        disabled={!manual || disabled}
        className="font-mono disabled:opacity-50"
      />
      {!manual && (
        <p className="text-xs text-[var(--text-dim)] font-mono">
          Lot number will be assigned automatically
        </p>
      )}
    </div>
  );
}
