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

  async function handleGoogleLogin() {
    setError('');
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    }
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

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[var(--text-dim)]/20" />
        <span className="text-xs text-[var(--text-dim)] uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-[var(--text-dim)]/20" />
      </div>

      {/* Google sign-in */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full h-12 rounded-full border border-[var(--text-dim)]/30 bg-white flex items-center justify-center gap-3 text-sm font-medium text-[var(--text-body)] hover:border-[var(--text-dim)] hover:bg-[var(--bg-off)] active:scale-[0.98] transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}
