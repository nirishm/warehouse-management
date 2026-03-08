'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (tokenHash && type === 'recovery') {
      // Exchange the token_hash for a session
      const supabase = createBrowserClient();
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (error) {
          setError('This reset link is invalid or has expired. Please request a new one.');
        } else {
          setReady(true);
        }
      });
    } else {
      // Fallback: handle hash-based recovery token (older flow)
      const supabase = createBrowserClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [searchParams]);

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

    router.push('/login');
  }

  return (
    <Card className="border-border bg-[var(--bg-off)] backdrop-blur shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-foreground font-medium">Set new password</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!ready && !error && (
            <p className="text-sm text-[var(--text-muted)]">Verifying reset link…</p>
          )}
          {error && (
            <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[var(--text-muted)] text-sm">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!ready}
              className="bg-muted border-border text-foreground placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)] focus:ring-[var(--accent-color)]/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-[var(--text-muted)] text-sm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={!ready}
              className="bg-muted border-border text-foreground placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)] focus:ring-[var(--accent-color)]/20"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={loading || !ready}
            className="w-full bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-background font-semibold tracking-wide"
          >
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
