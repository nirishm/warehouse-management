'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type View = 'login' | 'forgot' | 'forgot-sent';

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    router.refresh();
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
