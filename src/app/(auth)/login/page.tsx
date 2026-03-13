'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type View = 'login' | 'forgot' | 'forgot-sent';

function LoginPageInner() {
  const router = useRouter();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const [error, setError] = useState(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'auth_callback_failed') {
      return 'Password reset link has expired or is invalid. Please request a new one.';
    }
    return '';
  });
  const [googleLoading, setGoogleLoading] = useState(false);

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/sync', { method: 'POST' });
      const body = await res.json();

      if (body.tenant_slug) {
        router.push(`/t/${body.tenant_slug}`);
      } else if (body.is_super_admin) {
        router.push('/admin');
      } else {
        router.push('/no-tenant');
      }
    } catch {
      router.push('/');
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/set-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setView('forgot-sent');
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
    // If successful, browser redirects to Google — no further action needed.
  }

  if (view === 'forgot-sent') {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold text-stone-900 mb-2">Check your email</h2>
        <p className="text-sm text-stone-500 mb-6">
          We&apos;ve sent a password reset link to <strong>{email}</strong>.
          Check your inbox and follow the link to reset your password.
        </p>
        <button
          onClick={() => { setView('login'); setError(''); }}
          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          Back to login
        </button>
      </div>
    );
  }

  if (view === 'forgot') {
    return (
      <div>
        <h2 className="text-xl font-bold text-stone-900 mb-1">Forgot password?</h2>
        <p className="text-sm text-stone-500 mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-stone-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          <button
            onClick={() => { setView('login'); setError(''); }}
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            Back to login
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-stone-900 mb-1">Welcome back</h2>
      <p className="text-sm text-stone-500 mb-6">Sign in to your account</p>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-stone-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-bold text-stone-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-3 text-stone-400">or</span>
        </div>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="flex w-full h-12 items-center justify-center gap-3 rounded-full border-[1.5px] border-stone-300 bg-white text-sm font-bold text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          'Redirecting...'
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </>
        )}
      </button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          onClick={() => { setView('forgot'); setError(''); }}
          className="text-orange-500 hover:text-orange-600 font-medium"
        >
          Forgot password?
        </button>
        <Link href="/register" className="text-stone-500 hover:text-stone-700">
          Create account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
