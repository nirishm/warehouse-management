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
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-zinc-200 text-base">Schema Provisioning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-400">
          Schema: <code className="text-amber-500 font-mono">{schemaName}</code>
        </p>
        {result && (
          <div className={`text-sm px-3 py-2 rounded-md border ${
            result === 'success'
              ? 'text-emerald-400 bg-emerald-950/50 border-emerald-900'
              : 'text-red-400 bg-red-950/50 border-red-900'
          }`}>
            {message}
          </div>
        )}
        <Button
          onClick={handleProvision}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold"
        >
          {loading ? 'Provisioning...' : 'Provision Schema'}
        </Button>
      </CardContent>
    </Card>
  );
}
