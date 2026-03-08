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
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Invite Tenant Admin</CardTitle>
      </CardHeader>
      <form onSubmit={handleInvite}>
        <CardContent className="space-y-4">
          {result && (
            <div className={`text-sm px-3 py-2 rounded-md border ${
              result.type === 'success'
                ? 'text-[var(--green)] bg-[var(--green-bg)] border-[var(--green)]/20'
                : 'text-[var(--red)] bg-[var(--red-bg)] border-[var(--red)]/20'
            }`}>
              {result.message}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[var(--text-muted)] text-sm">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="bg-muted border-border text-foreground placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-muted)] text-sm">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                className="bg-muted border-border text-foreground placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)]"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold"
          >
            {loading ? 'Sending...' : 'Send Invite'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
