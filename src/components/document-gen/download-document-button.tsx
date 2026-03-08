'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DownloadDocumentButtonProps {
  href: string;
  label?: string;
}

export function DownloadDocumentButton({ href, label = 'Download PDF' }: DownloadDocumentButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error('Failed to generate document');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = href.split('/').pop() + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
      {loading ? 'Generating…' : label}
    </Button>
  );
}
