'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TenantProvisionButton({ tenantId, schemaName }: { tenantId: string; schemaName: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  async function handleProvision() {
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/admin/tenants/${tenantId}/provision`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setResult('success');
      setMessage('Schema provisioned successfully');
    } else {
      setResult('error');
      setMessage(data.error || 'Provisioning failed');
    }
    setLoading(false);
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Schema Provisioning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--text-muted)]">
          Schema: <code className="text-[var(--accent-color)] font-mono">{schemaName}</code>
        </p>
        {result && (
          <div className={`text-sm px-3 py-2 rounded-md border ${
            result === 'success'
              ? 'text-[var(--green)] bg-[var(--green-bg)] border-[var(--green)]/20'
              : 'text-[var(--red)] bg-[var(--red-bg)] border-[var(--red)]/20'
          }`}>
            {message}
          </div>
        )}
        <Button
          onClick={handleProvision}
          disabled={loading}
          className="bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold"
        >
          {loading ? 'Provisioning...' : 'Provision Schema'}
        </Button>
      </CardContent>
    </Card>
  );
}
