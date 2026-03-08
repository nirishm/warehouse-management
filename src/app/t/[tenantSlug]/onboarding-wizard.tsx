'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  tenantSlug: string;
  tenantId: string;
  schemaName: string;
}

type Step = 'location' | 'commodity' | 'invite' | 'done';

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'location', label: 'Location' },
  { key: 'commodity', label: 'Commodity' },
  { key: 'invite', label: 'Invite' },
];

export function OnboardingWizard({ tenantSlug }: Props) {
  const [step, setStep] = useState<Step>('location');
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const router = useRouter();
  const api = `/api/t/${tenantSlug}`;

  // Location form state
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState('warehouse');
  const [locAddress, setLocAddress] = useState('');

  // Commodity form state
  const [comName, setComName] = useState('');
  const [comCode, setComCode] = useState('');
  const [comCategory, setComCategory] = useState('');
  const [comUnitId, setComUnitId] = useState('');

  // Invite form state
  const [invEmail, setInvEmail] = useState('');
  const [invName, setInvName] = useState('');
  const [invRole, setInvRole] = useState('employee');

  // Check localStorage skip on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(`wareos_skip_onboarding_${tenantSlug}`)) {
      setSkipped(true);
    }
  }, [tenantSlug]);

  // Check URL param for skip (set by handleSkip redirect)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('skipOnboarding') === '1') {
        setSkipped(true);
      }
    }
  }, []);

  // Fetch units for commodity step
  useEffect(() => {
    fetch(`${api}/units`).then(r => r.json()).then(data => {
      setUnits(data.data ?? data ?? []);
    }).catch(() => {});
  }, [api]);

  if (skipped) {
    // Show a minimal "loading dashboard" state — the server component
    // will still render the wizard since locations.length === 0, but
    // the client check prevents showing it. A full page navigation
    // ensures the dashboard loads properly.
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[var(--text-muted)]">Loading dashboard...</p>
      </div>
    );
  }

  function handleSkip() {
    localStorage.setItem(`wareos_skip_onboarding_${tenantSlug}`, '1');
    setSkipped(true);
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);

  async function handleLocationSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch(`${api}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: locName, code: locCode, type: locType, address: locAddress || undefined }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create location');
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('commodity');
  }

  async function handleCommoditySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch(`${api}/commodities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: comName,
        code: comCode,
        category: comCategory || undefined,
        default_unit_id: comUnitId || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create commodity');
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('invite');
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch(`${api}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invEmail, fullName: invName, role: invRole }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to send invite');
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('done');
  }

  // ── Done state ─────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--green-bg)] flex items-center justify-center mx-auto mb-4">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9l4 4 8-8" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">You&apos;re all set!</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Your workspace is ready. Start managing your inventory.
          </p>
          <Button
            onClick={() => router.refresh()}
            className="h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all px-8"
          >
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-12">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`h-2 w-8 rounded-full transition-colors ${
                i < stepIndex
                  ? 'bg-[var(--green)]'
                  : i === stepIndex
                  ? 'bg-[var(--accent-color)]'
                  : 'bg-[var(--text-dim)]/30'
              }`}
            />
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-8 relative">
        {/* Skip link */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-5 text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
        >
          Skip setup
        </button>

        {/* ── Step 1: Location ─────────────────────────── */}
        {step === 'location' && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Add your first location</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Where do you store inventory? Create a warehouse, store, or yard.
            </p>
            <form onSubmit={handleLocationSubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="loc-name" className="text-sm text-[var(--text-muted)] font-normal">Name</Label>
                <Input
                  id="loc-name" required value={locName} onChange={(e) => setLocName(e.target.value)}
                  placeholder="Main Warehouse"
                  className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="loc-code" className="text-sm text-[var(--text-muted)] font-normal">Code</Label>
                  <Input
                    id="loc-code" required value={locCode}
                    onChange={(e) => setLocCode(e.target.value.toUpperCase())}
                    placeholder="WH-01"
                    className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-type" className="text-sm text-[var(--text-muted)] font-normal">Type</Label>
                  <select
                    id="loc-type" value={locType} onChange={(e) => setLocType(e.target.value)}
                    className="h-[var(--input-h)] w-full bg-white border border-[var(--text-dim)]/30 text-[var(--text-body)] rounded-lg px-3 text-sm focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 focus:outline-none"
                  >
                    <option value="warehouse">Warehouse</option>
                    <option value="store">Store</option>
                    <option value="yard">Yard</option>
                    <option value="external">External</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loc-address" className="text-sm text-[var(--text-muted)] font-normal">Address (optional)</Label>
                <Input
                  id="loc-address" value={locAddress} onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="123 Industrial Ave"
                  className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
                />
              </div>
              <Button
                type="submit" disabled={loading}
                className="w-full h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all mt-2"
              >
                {loading ? 'Creating...' : 'Create location'}
              </Button>
            </form>
          </>
        )}

        {/* ── Step 2: Commodity ─────────────────────────── */}
        {step === 'commodity' && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Add your first commodity</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              What items do you track? Create a material, product, or part.
            </p>
            <form onSubmit={handleCommoditySubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="com-name" className="text-sm text-[var(--text-muted)] font-normal">Name</Label>
                <Input
                  id="com-name" required value={comName} onChange={(e) => setComName(e.target.value)}
                  placeholder="Steel Rebar 12mm"
                  className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="com-code" className="text-sm text-[var(--text-muted)] font-normal">Code</Label>
                  <Input
                    id="com-code" required value={comCode}
                    onChange={(e) => setComCode(e.target.value.toUpperCase())}
                    placeholder="STL-RB-12"
                    className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="com-unit" className="text-sm text-[var(--text-muted)] font-normal">Unit</Label>
                  <select
                    id="com-unit" value={comUnitId} onChange={(e) => setComUnitId(e.target.value)}
                    className="h-[var(--input-h)] w-full bg-white border border-[var(--text-dim)]/30 text-[var(--text-body)] rounded-lg px-3 text-sm focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 focus:outline-none"
                  >
                    <option value="">No default unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="com-category" className="text-sm text-[var(--text-muted)] font-normal">Category (optional)</Label>
                <Input
                  id="com-category" value={comCategory} onChange={(e) => setComCategory(e.target.value)}
                  placeholder="Raw Materials"
                  className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button" variant="outline" onClick={() => setStep('invite')}
                  className="h-12 rounded-full border-[var(--text-dim)]/40 text-[var(--text-muted)] hover:text-[var(--text-body)] hover:border-[var(--text-dim)] hover:bg-transparent font-medium px-6 transition-all"
                >
                  Skip
                </Button>
                <Button
                  type="submit" disabled={loading}
                  className="flex-1 h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all"
                >
                  {loading ? 'Creating...' : 'Create commodity'}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 3: Invite ─────────────────────────── */}
        {step === 'invite' && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Invite a team member</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Add someone to your workspace. They&apos;ll receive an email with setup instructions.
            </p>
            <form onSubmit={handleInviteSubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="inv-email" className="text-sm text-[var(--text-muted)] font-normal">Email</Label>
                <Input
                  id="inv-email" type="email" required value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-name" className="text-sm text-[var(--text-muted)] font-normal">Full name</Label>
                  <Input
                    id="inv-name" value={invName} onChange={(e) => setInvName(e.target.value)}
                    placeholder="Jane Doe"
                    className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-role" className="text-sm text-[var(--text-muted)] font-normal">Role</Label>
                  <select
                    id="inv-role" value={invRole} onChange={(e) => setInvRole(e.target.value)}
                    className="h-[var(--input-h)] w-full bg-white border border-[var(--text-dim)]/30 text-[var(--text-body)] rounded-lg px-3 text-sm focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 focus:outline-none"
                  >
                    <option value="employee">Employee</option>
                    <option value="tenant_admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button" variant="outline" onClick={() => setStep('done')}
                  className="h-12 rounded-full border-[var(--text-dim)]/40 text-[var(--text-muted)] hover:text-[var(--text-body)] hover:border-[var(--text-dim)] hover:bg-transparent font-medium px-6 transition-all"
                >
                  Skip
                </Button>
                <Button
                  type="submit" disabled={loading}
                  className="flex-1 h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all"
                >
                  {loading ? 'Sending invite...' : 'Send invite'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
