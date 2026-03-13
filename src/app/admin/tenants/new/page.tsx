'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewTenantPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create tenant');
      }
      toast.success('Tenant created');
      window.location.href = '/admin/tenants';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 style={{ color: 'var(--text-primary)' }} className="text-[20px] font-bold mb-6">
        New Tenant
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
            required
          />
        </div>
        <div>
          <Label>Slug</Label>
          <Input
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
            }
            placeholder="acme-corp"
            required
          />
          <p style={{ color: 'var(--text-dim)' }} className="text-[12px] mt-1">
            URL-safe identifier. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="rounded-full h-[48px] w-fit px-6"
          style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
        >
          {submitting ? 'Creating...' : 'Create Tenant'}
        </Button>
      </form>
    </div>
  );
}
