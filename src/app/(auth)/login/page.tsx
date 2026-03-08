'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type View = 'login' | 'forgot' | 'forgot-sent';

export default function LoginPage() {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setView('forgot-sent');
    setLoading(false);
  }

  function switchView(next: View) {
    setError('');
    setPassword('');
    setView(next);
  }

  // ── Sent confirmation ──────────────────────────────────────────────────────
  if (view === 'forgot-sent') {
    return (
      <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-10 text-center">
        <div className="w-10 h-10 rounded-full bg-[var(--green-bg)] flex items-center justify-center mx-auto mb-4">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9l4 4 8-8" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Check your email</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          We sent a reset link to{' '}
          <span className="text-[var(--text-body)] font-medium">{email}</span>.
        </p>
        <button
          onClick={() => switchView('login')}
          className="text-sm text-[var(--accent-color)] hover:text-[var(--accent-dark)] transition-colors font-medium"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // ── Forgot password form ───────────────────────────────────────────────────
  if (view === 'forgot') {
    return (
      <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-8">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Reset password</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleForgot} className="space-y-5">
          {error && (
            <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-sm text-[var(--text-muted)] font-normal">
              Email
            </Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all mt-2"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>

          <p className="text-sm text-center text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => switchView('login')}
              className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] transition-colors font-medium"
            >
              Back to sign in
            </button>
          </p>
        </form>
      </div>
    );
  }

  // ── Login form (default) ───────────────────────────────────────────────────
  return (
    <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-8">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Sign in</h2>

      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-[var(--text-muted)] font-normal">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm text-[var(--text-muted)] font-normal">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
          />
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => switchView('forgot')}
            className="w-full h-12 rounded-full border-[var(--text-dim)]/40 text-[var(--text-muted)] hover:text-[var(--text-body)] hover:border-[var(--text-dim)] hover:bg-transparent font-medium tracking-wide transition-all"
          >
            Forgot password?
          </Button>
        </div>
      </form>
    </div>
  );
}
