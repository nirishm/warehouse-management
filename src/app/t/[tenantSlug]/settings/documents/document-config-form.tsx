'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface DocumentConfig {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_gstin: string;
  logo_url: string;
  footer_text: string;
}

const EMPTY_CONFIG: DocumentConfig = {
  company_name: '',
  company_address: '',
  company_phone: '',
  company_email: '',
  company_gstin: '',
  logo_url: '',
  footer_text: '',
};

interface Props {
  tenantSlug: string;
}

export function DocumentConfigForm({ tenantSlug }: Props) {
  const [form, setForm] = useState<DocumentConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'saved' | 'error'; message: string } | null>(null);
  const [moduleDisabled, setModuleDisabled] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/t/${tenantSlug}/documents/config`);
        if (res.status === 403) {
          setModuleDisabled(true);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (json.data) {
          setForm({
            company_name: json.data.company_name ?? '',
            company_address: json.data.company_address ?? '',
            company_phone: json.data.company_phone ?? '',
            company_email: json.data.company_email ?? '',
            company_gstin: json.data.company_gstin ?? '',
            logo_url: json.data.logo_url ?? '',
            footer_text: json.data.footer_text ?? '',
          });
        }
      } catch {
        setStatus({ type: 'error', message: 'Failed to load configuration' });
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [tenantSlug]);

  function update(field: keyof DocumentConfig, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setStatus(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
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
      setStatus({ type: 'saved', message: 'Configuration saved successfully' });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSaving(false);
    }
  }

  if (moduleDisabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Document Configuration
          </h1>
        </div>
        <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-base)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Document Generation module is not enabled.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Document Configuration
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Configure company details for generated PDF documents
          </p>
        </div>
        <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-base)] p-6 space-y-5 max-w-xl animate-pulse">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-[var(--bg-off)]" />
              <div className="h-9 rounded bg-[var(--bg-off)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Document Configuration
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Configure company details for generated PDF documents
          </p>
        </div>
        {status && (
          <span
            className={`text-sm ${
              status.type === 'saved' ? 'text-[var(--green)]' : 'text-[var(--red)]'
            }`}
          >
            {status.message}
          </span>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border border-[var(--border)] rounded-lg bg-[var(--bg-base)] p-6 space-y-5 max-w-xl"
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
            Company Name *
          </Label>
          <Input
            value={form.company_name}
            onChange={(e) => update('company_name', e.target.value)}
            required
            className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
            Address
          </Label>
          <Textarea
            value={form.company_address}
            onChange={(e) => update('company_address', e.target.value)}
            className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
              Phone
            </Label>
            <Input
              value={form.company_phone}
              onChange={(e) => update('company_phone', e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
              Email
            </Label>
            <Input
              type="email"
              value={form.company_email}
              onChange={(e) => update('company_email', e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
            GSTIN
          </Label>
          <Input
            value={form.company_gstin}
            onChange={(e) => update('company_gstin', e.target.value)}
            className="font-mono bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            placeholder="22AAAAA0000A1Z5"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
            Logo URL
          </Label>
          <Input
            value={form.logo_url}
            onChange={(e) => update('logo_url', e.target.value)}
            placeholder="https://..."
            className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
            Footer Text
          </Label>
          <Textarea
            value={form.footer_text}
            onChange={(e) => update('footer_text', e.target.value)}
            placeholder="Thank you for your business"
            className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving} variant="orange">
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
