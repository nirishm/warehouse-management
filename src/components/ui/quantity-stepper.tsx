'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  label,
  unit,
}: QuantityStepperProps) {
  const [holding, setHolding] = useState<'inc' | 'dec' | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);

  const increment = useCallback(
    (amount: number) => {
      onChange(Math.min(max, value + amount));
    },
    [value, max, onChange]
  );

  const decrement = useCallback(
    (amount: number) => {
      onChange(Math.max(min, value - amount));
    },
    [value, min, onChange]
  );

  // Long-press acceleration: after 500ms starts repeating, after 1.5s accelerates to step*10
  useEffect(() => {
    if (!holding) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    holdStartRef.current = Date.now();
    const fn = holding === 'inc' ? increment : decrement;

    // Start repeating after 400ms
    const timeout = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - holdStartRef.current;
        const amount = elapsed > 1500 ? step * 10 : step;
        fn(amount);
      }, 100);
    }, 400);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [holding, increment, decrement, step]);

  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onPointerDown={() => {
            decrement(step);
            setHolding('dec');
          }}
          onPointerUp={() => setHolding(null)}
          onPointerLeave={() => setHolding(null)}
          disabled={value <= min}
          className="flex items-center justify-center w-14 h-14 rounded-xl border border-border bg-white text-[var(--text-body)] hover:bg-[var(--bg-off)] active:bg-[var(--bg-off)] disabled:opacity-30 disabled:pointer-events-none transition-colors touch-manipulation select-none"
        >
          <Minus size={24} />
        </button>

        <div className="flex-1 text-center">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) {
                onChange(Math.max(min, Math.min(max, v)));
              }
            }}
            className="w-full text-center text-2xl font-mono font-bold text-foreground bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && (
            <p className="text-xs font-mono text-[var(--text-dim)] mt-0.5">{unit}</p>
          )}
        </div>

        <button
          type="button"
          onPointerDown={() => {
            increment(step);
            setHolding('inc');
          }}
          onPointerUp={() => setHolding(null)}
          onPointerLeave={() => setHolding(null)}
          disabled={value >= max}
          className="flex items-center justify-center w-14 h-14 rounded-xl border border-border bg-white text-[var(--text-body)] hover:bg-[var(--bg-off)] active:bg-[var(--bg-off)] disabled:opacity-30 disabled:pointer-events-none transition-colors touch-manipulation select-none"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}
