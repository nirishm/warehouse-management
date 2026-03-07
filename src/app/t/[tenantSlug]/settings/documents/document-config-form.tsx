'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DocumentConfig } from '@/modules/document-gen/validations/config';

interface Props {
  tenantSlug: string;
  initialConfig: DocumentConfig | null;
}

export function DocumentConfigForm({ tenantSlug, initialConfig }: Props) {
  const [form, setForm] = useState({
    company_name: initialConfig?.company_name ?? '',
    company_address: initialConfig?.company_address ?? '',
    company_phone: initialConfig?.company_phone ?? '',
    company_email: initialConfig?.company_email ?? '',
    company_gstin: initialConfig?.company_gstin ?? '',
    logo_url: initialConfig?.logo_url ?? '',
    footer_text: initialConfig?.footer_text ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/documents/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          company_email: form.company_email || null,
          logo_url: form.logo_url || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/60 p-6 space-y-5 max-w-xl">
      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Company Name *</Label>
        <Input
          value={form.company_name}
          onChange={(e) => update('company_name', e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Address</Label>
        <Textarea
          value={form.company_address}
          onChange={(e) => update('company_address', e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Phone</Label>
          <Input
            value={form.company_phone}
            onChange={(e) => update('company_phone', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Email</Label>
          <Input
            type="email"
            value={form.company_email}
            onChange={(e) => update('company_email', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">GSTIN</Label>
        <Input
          value={form.company_gstin}
          onChange={(e) => update('company_gstin', e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono"
          placeholder="22AAAAA0000A1Z5"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Logo URL</Label>
        <Input
          value={form.logo_url}
          onChange={(e) => update('logo_url', e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Footer Text</Label>
        <Input
          value={form.footer_text}
          onChange={(e) => update('footer_text', e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
          placeholder="Thank you for your business"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
        {saved && <span className="text-sm text-green-400">Saved</span>}
      </div>
    </div>
  );
}
