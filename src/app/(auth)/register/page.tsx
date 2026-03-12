'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type View = 'register' | 'check-email';

export default function RegisterPage() {
  const [view, setView] = useState<View>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setView('check-email');
  }

  if (view === 'check-email') {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold text-stone-900 mb-2">Check your email</h2>
        <p className="text-sm text-stone-500 mb-6">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>.
          Click the link to activate your account.
        </p>
        <Link
          href="/login"
          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-stone-900 mb-1">Create your account</h2>
      <p className="text-sm text-stone-500 mb-6">Get started with WareOS</p>
      <form onSubmit={handleRegister} className="space-y-4">
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
            placeholder="Min. 8 characters"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-bold text-stone-700 mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm transition-colors"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        Already have an account?{' '}
        <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
