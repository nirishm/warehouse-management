'use client';

import { getIcon } from '@/components/layout/icon-map';
import { useState, useEffect } from 'react';

interface SettingsPageProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    enabledModules: string[];
  };
  role: string;
  allModules: { id: string; name: string; description: string; icon: string }[];
  tenantSlug: string;
}

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP'];
const DATE_FORMAT_OPTIONS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

export function SettingsPage({ tenant, role, allModules, tenantSlug }: SettingsPageProps) {
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    setCurrency(localStorage.getItem('wareos_currency') || 'INR');
    setDateFormat(localStorage.getItem('wareos_date_format') || 'DD/MM/YYYY');
    setTimezone(
      localStorage.getItem('wareos_timezone') ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  }, []);

  function updateCurrency(value: string) {
    setCurrency(value);
    localStorage.setItem('wareos_currency', value);
  }

  function updateDateFormat(value: string) {
    setDateFormat(value);
    localStorage.setItem('wareos_date_format', value);
  }

  function updateTimezone(value: string) {
    setTimezone(value);
    localStorage.setItem('wareos_timezone', value);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>

      {/* Organization Info */}
      <div className="rounded-xl border border-border bg-[var(--bg-base)] p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-4">
          Organization Info
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-1 block">
              Name
            </label>
            <p className="text-sm font-bold text-[var(--text-primary)]">{tenant.name}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-1 block">
              Slug
            </label>
            <p className="font-mono text-sm text-[var(--text-muted)]">{tenant.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full px-3 py-1 text-xs font-bold uppercase bg-[var(--accent-tint)] text-[var(--accent-color)]">
              {tenant.plan}
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-bold uppercase bg-[var(--green-bg)] text-[var(--green)]">
              {tenant.status}
            </span>
          </div>
        </div>
      </div>

      {/* Enabled Modules */}
      <div className="rounded-xl border border-border bg-[var(--bg-base)] p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-4">
          Enabled Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {allModules.map((mod) => {
            const enabled = tenant.enabledModules.includes(mod.id);
            const Icon = getIcon(mod.icon);
            return (
              <div
                key={mod.id}
                className={`rounded-xl border bg-[var(--bg-base)] p-4 ${
                  enabled
                    ? 'border-l-4 border-l-[var(--accent-color)]'
                    : 'opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={20} />
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {mod.name}
                    </span>
                  </div>
                  {enabled ? (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-[var(--green-bg)] text-[var(--green)]">
                      Enabled
                    </span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-[var(--bg-off)] text-[var(--text-muted)]">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{mod.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-xl border border-border bg-[var(--bg-base)] p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-4">
          Preferences
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-2 block">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => updateCurrency(e.target.value)}
              className="h-[var(--input-h)] w-full rounded-lg border border-input bg-white px-3 text-sm"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-2 block">
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => updateDateFormat(e.target.value)}
              className="h-[var(--input-h)] w-full rounded-lg border border-input bg-white px-3 text-sm"
            >
              {DATE_FORMAT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-2 block">
              Timezone
            </label>
            <p className="text-sm text-[var(--text-primary)] leading-[var(--input-h)]">
              {timezone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
