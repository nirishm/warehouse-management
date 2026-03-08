'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-10 text-center">
        <div className="w-10 h-10 rounded-full bg-[var(--green-bg)] flex items-center justify-center mx-auto mb-4">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9l4 4 8-8" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Check your email</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          We sent a confirmation link to{' '}
          <span className="text-[var(--text-body)] font-medium">{email}</span>.
        </p>
        <Link
          href="/login"
          className="text-sm text-[var(--accent-color)] hover:text-[var(--accent-dark)] transition-colors font-medium"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-8">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Create account</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Sign up to request access to a workspace.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-sm text-[var(--text-muted)] font-normal">
            Full name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
          />
        </div>

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
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all mt-2"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-sm text-center text-[var(--text-muted)]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
