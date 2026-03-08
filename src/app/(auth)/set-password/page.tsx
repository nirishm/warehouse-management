'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-8">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Welcome to WareOS</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        You&apos;ve been added to a workspace. Set a password to access your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm text-[var(--text-muted)] font-normal">
            New password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm text-[var(--text-muted)] font-normal">
            Confirm password
          </Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all mt-2 disabled:opacity-40"
        >
          {loading ? 'Setting password…' : 'Set password'}
        </Button>
      </form>
    </div>
  );
}
