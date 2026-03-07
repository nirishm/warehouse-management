'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImportResults } from './import-results';

interface ImportResult {
  summary: { total: number; inserted: number; failed: number };
  errors: { row: number; field: string; message: string }[];
}

interface ImportDropzoneProps {
  label: string;
  uploadUrl: string;
  templateUrl: string;
  accept?: string;
}

export function ImportDropzone({
  label,
  uploadUrl,
  templateUrl,
  accept = '.csv',
}: ImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setResult(null);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(uploadUrl, { method: 'POST', body: form });
      const json: ImportResult = await res.json();
      setResult(json);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    upload(files[0]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">{label}</span>
        <a
          href={templateUrl}
          className="text-xs font-mono text-amber-500 hover:text-amber-400 underline underline-offset-2"
        >
          Download template
        </a>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragging
            ? 'border-amber-500 bg-amber-500/5'
            : 'border-zinc-700 hover:border-zinc-600'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <p className="text-sm font-mono text-zinc-400">Processing…</p>
        ) : (
          <>
            <p className="text-sm text-zinc-400">Drop CSV here or click to browse</p>
            <p className="text-xs text-zinc-600 mt-1 font-mono">.csv files only</p>
          </>
        )}
      </div>

      {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}

      {result && (
        <>
          <ImportResults summary={result.summary} errors={result.errors} />
          {result.summary.failed === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResult(null)}
              className="text-zinc-500 text-xs"
            >
              Import another file
            </Button>
          )}
        </>
      )}
    </div>
  );
}
