'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

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
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(commodityCode, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url: string) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(''); });
    return () => { cancelled = true; };
  }, [commodityCode, size]);

  return (
    <div className="flex flex-col items-center gap-1.5 p-3 border border-zinc-300 rounded bg-white print:border-black">
      {dataUrl && (
        <img
          src={dataUrl}
          alt={`QR code for ${commodityCode}`}
          width={size}
          height={size}
          style={{ imageRendering: 'pixelated' }}
        />
      )}
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
