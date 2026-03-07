'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InviteForm({ tenantId }: { tenantId: string }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch(`/api/admin/tenants/${tenantId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult({ type: 'success', message: `Invitation sent to ${email}` });
      setEmail('');
      setFullName('');
      router.refresh();
    } else {
      setResult({ type: 'error', message: data.error || 'Failed to invite' });
    }
    setLoading(false);
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-zinc-200 text-base">Invite Tenant Admin</CardTitle>
      </CardHeader>
      <form onSubmit={handleInvite}>
        <CardContent className="space-y-4">
          {result && (
            <div className={`text-sm px-3 py-2 rounded-md border ${
              result.type === 'success'
                ? 'text-emerald-400 bg-emerald-950/50 border-emerald-900'
                : 'text-red-400 bg-red-950/50 border-red-900'
            }`}>
              {result.message}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-sm">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-sm">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold"
          >
            {loading ? 'Sending...' : 'Send Invite'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
