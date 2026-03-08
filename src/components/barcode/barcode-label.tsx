'use client';

import QRCode from 'react-qr-code';

interface BarcodeLabelProps {
  commodityCode: string;
  commodityName: string;
  size?: number;
}

export function BarcodeLabel({
  commodityCode,
  commodityName,
  size = 96,
}: BarcodeLabelProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 border border-zinc-300 rounded bg-white print:border-black">
      <QRCode
        value={commodityCode}
        size={size}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
      />
      <p className="text-xs font-mono font-bold text-black leading-tight text-center">
        {commodityCode}
      </p>
      <p
        className="text-[10px] text-black leading-tight text-center max-w-[100px] truncate"
        title={commodityName}
      >
        {commodityName}
      </p>
    </div>
  );
}
