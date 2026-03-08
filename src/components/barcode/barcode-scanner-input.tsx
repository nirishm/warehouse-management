'use client';

import { useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScanLine } from 'lucide-react';

interface BarcodeScannerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Text input with optional camera scan button.
 * On supported browsers (Chrome Android, Safari 17+), uses the BarcodeDetector API
 * to decode a photo taken with the rear camera. Falls back to plain text input.
 */
export function BarcodeScannerInput({
  value,
  onChange,
  placeholder = 'Commodity code',
  className,
}: BarcodeScannerInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  const supportsDetector =
    typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const handleCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setScanning(true);
      try {
        // BarcodeDetector is available on Chrome 83+ / Safari 17+
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
        });
        const bitmap = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (barcodes.length > 0) {
          onChange(barcodes[0].rawValue as string);
        }
      } catch {
        // BarcodeDetector failed — user can type manually
      } finally {
        setScanning(false);
        // Reset so the same file can be selected again
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [onChange]
  );

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono"
      />
      {supportsDetector && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Scan barcode with camera"
            disabled={scanning}
            onClick={() => fileRef.current?.click()}
            className="shrink-0"
          >
            <ScanLine className="size-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCapture}
          />
        </>
      )}
    </div>
  );
}
