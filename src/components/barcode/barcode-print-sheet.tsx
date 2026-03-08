'use client';

import { BarcodeLabel } from './barcode-label';

interface Commodity {
  id: string;
  code: string;
  name: string;
}

interface BarcodePrintSheetProps {
  commodities: Commodity[];
}

export function BarcodePrintSheet({ commodities }: BarcodePrintSheetProps) {
  if (commodities.length === 0) {
    return (
      <p className="text-sm text-[var(--text-dim)] text-center py-8">
        No commodities selected for printing.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 p-4 print:p-0 print:gap-2">
      {commodities.map((c) => (
        <BarcodeLabel
          key={c.id}
          commodityCode={c.code}
          commodityName={c.name}
          size={80}
        />
      ))}
    </div>
  );
}
