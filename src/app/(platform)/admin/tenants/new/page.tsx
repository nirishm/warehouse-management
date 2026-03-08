'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewTenantPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState('free');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, plan }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create tenant');
      setLoading(false);
      return;
    }

    const { tenant } = await res.json();
    router.push(`/admin/tenants/${tenant.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight mb-6">New Tenant</h1>
      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Tenant Details</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[var(--text-muted)] text-sm">Company Name</Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setSlug(generateSlug(e.target.value)); }}
                placeholder="Acme Grain Corp"
                required
                className="bg-muted border-border text-foreground placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-muted)] text-sm">Slug (URL identifier)</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme-grain"
                required
                pattern="[a-z0-9-]+"
                className="bg-muted border-border text-foreground font-mono placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-muted)] text-sm">Plan</Label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-muted text-foreground px-3 text-sm focus:border-[var(--accent-color)] focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-background font-semibold"
            >
              {loading ? 'Creating...' : 'Create Tenant'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
