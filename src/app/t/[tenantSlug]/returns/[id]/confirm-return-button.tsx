'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Props {
  tenantSlug: string;
  returnId: string;
}

export function ConfirmReturnButton({ tenantSlug, returnId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setLoading(true);
    try {
      await fetch(`/api/t/${tenantSlug}/returns/${returnId}/confirm`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={handleConfirm} disabled={loading}>
      {loading ? 'Confirming…' : 'Confirm Return'}
    </Button>
  );
}
