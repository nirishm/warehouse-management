'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TenantInfo {
  name: string;
  slug: string;
  plan: string;
  status: string;
  enabled_modules: string[];
  created_at: string;
}

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface SettingsClientProps {
  tenant: TenantInfo;
  allModules: ModuleInfo[];
  role: 'tenant_admin' | 'manager' | 'employee';
  tenantSlug: string;
}

const MODULE_ICONS: Record<string, string> = {
  Package: '\u{1F4E6}',
  Truck: '\u{1F69A}',
  ShoppingCart: '\u{1F6D2}',
  IndianRupee: '\u{1F4B0}',
  BarChart3: '\u{1F4CA}',
  AlertTriangle: '\u{26A0}\u{FE0F}',
  Users: '\u{1F465}',
  ClipboardList: '\u{1F4CB}',
};

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const PLAN_STYLES: Record<string, string> = {
  free: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  pro: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function getPreference(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(`pref_${key}`) ?? fallback;
}

function setPreference(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`pref_${key}`, value);
}

export function SettingsClient({
  tenant,
  allModules,
  role,
  tenantSlug,
}: SettingsClientProps) {
  const router = useRouter();
  const isAdmin = role === 'tenant_admin';

  // Organization info state
  const [tenantName, setTenantName] = useState(tenant.name);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preferences state (client-side localStorage)
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    setCurrency(getPreference('currency', 'INR'));
    setDateFormat(getPreference('date_format', 'DD/MM/YYYY'));
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const handleSaveName = useCallback(async () => {
    if (!isAdmin || tenantName === tenant.name) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/t/${tenantSlug}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tenantName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }

      setSaveMessage({ type: 'success', text: 'Organization name updated successfully' });
      router.refresh();
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update settings',
      });
    } finally {
      setSaving(false);
    }
  }, [isAdmin, tenantName, tenant.name, tenantSlug, router]);

  const handleCurrencyChange = useCallback((value: string | null) => {
    if (!value) return;
    setCurrency(value);
    setPreference('currency', value);
  }, []);

  const handleDateFormatChange = useCallback((value: string | null) => {
    if (!value) return;
    setDateFormat(value);
    setPreference('date_format', value);
  }, []);

  return (
    <div className="space-y-6">
      {/* Section 1: Organization Info */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Organization Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tenant Name */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Organization Name
              </Label>
              {isAdmin ? (
                <div className="flex gap-2">
                  <Input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-600"
                    placeholder="Organization name"
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={saving || tenantName === tenant.name || !tenantName.trim()}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-zinc-200 py-2">{tenant.name}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Slug
              </Label>
              <p className="text-sm text-zinc-400 font-mono py-2 bg-zinc-950 border border-zinc-800 rounded-md px-3">
                {tenant.slug}
              </p>
            </div>

            {/* Plan */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Plan
              </Label>
              <div className="py-2">
                <Badge
                  className={`text-xs font-mono capitalize ${
                    PLAN_STYLES[tenant.plan] ?? PLAN_STYLES.free
                  }`}
                >
                  {tenant.plan}
                </Badge>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Status
              </Label>
              <div className="py-2">
                <Badge
                  className={`text-xs font-mono capitalize ${
                    STATUS_STYLES[tenant.status] ?? STATUS_STYLES.inactive
                  }`}
                >
                  {tenant.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Save feedback */}
          {saveMessage && (
            <p
              className={`text-sm font-mono ${
                saveMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {saveMessage.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Enabled Modules */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Enabled Modules
          </CardTitle>
          <p className="text-xs text-zinc-600 mt-1">
            Module access is managed by the platform administrator.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {allModules.map((mod) => {
              const isEnabled = tenant.enabled_modules.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    isEnabled
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-zinc-800 bg-zinc-950/50 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-lg" role="img" aria-label={mod.icon}>
                      {MODULE_ICONS[mod.icon] ?? '\u{1F4E6}'}
                    </span>
                    <Badge
                      className={`text-[10px] font-mono ${
                        isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                      }`}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-medium text-zinc-200">{mod.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{mod.description}</p>
                </div>
              );
            })}
          </div>

          {allModules.length === 0 && (
            <p className="text-sm text-zinc-500 font-mono text-center py-8">
              No modules registered
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Preferences (client-side) */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Preferences
          </CardTitle>
          <p className="text-xs text-zinc-600 mt-1">
            These preferences are stored locally in your browser.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Currency */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Currency
              </Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-600">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {CURRENCY_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Format */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Date Format
              </Label>
              <Select value={dateFormat} onValueChange={handleDateFormatChange}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-600">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {DATE_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Timezone
              </Label>
              <p className="text-sm text-zinc-400 font-mono py-2 bg-zinc-950 border border-zinc-800 rounded-md px-3">
                {timezone || 'Detecting...'}
              </p>
              <p className="text-[10px] text-zinc-600 font-mono">
                Auto-detected from your browser
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
