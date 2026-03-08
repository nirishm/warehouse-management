'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createBrowserClient();
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const code = searchParams.get('code');

    if (tokenHash && type === 'recovery') {
      // OTP flow: verify the token hash directly
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (error) {
          setError('This reset link is invalid or has expired. Please request a new one.');
        } else {
          setReady(true);
        }
      });
    } else if (code) {
      // PKCE flow: exchange the ?code= param for a session
      // Subscribe BEFORE exchange so we catch PASSWORD_RECOVERY if it fires
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true);
        }
      });

      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('This reset link is invalid or has expired. Please request a new one.');
        } else {
          // Session exchanged successfully — enable the form even if
          // PASSWORD_RECOVERY event didn't fire (may fire as SIGNED_IN)
          setReady(true);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // Implicit flow: Supabase dashboard recovery link lands on root with
      // #access_token=...&type=recovery in the hash. The Supabase JS client
      // parses the hash automatically and fires PASSWORD_RECOVERY. Listen for
      // it here, and also check if there's already an active recovery session.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true);
        }
      });

      // Also check if a recovery session is already established (user navigated
      // here after the hash was parsed on another page)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true);
        } else {
          setError('This reset link is invalid. Please request a new password reset from the sign in page.');
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

    router.push('/');
  }

  return (
    <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-8">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Set new password</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {!ready && !error && (
          <p className="text-sm text-[var(--text-muted)]">Verifying reset link…</p>
        )}
        {error && (
          <div className="space-y-3">
            <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-lg px-3 py-2">
              {error}
            </div>
            <p className="text-sm text-center text-[var(--text-muted)]">
              <a href="/login" className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] transition-colors font-medium">
                Back to sign in
              </a>
            </p>
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
            disabled={!ready}
            className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg disabled:opacity-40"
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
            disabled={!ready}
            className="h-[var(--input-h)] bg-white border-[var(--text-dim)]/30 text-[var(--text-body)] placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/10 rounded-lg disabled:opacity-40"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !ready}
          className="w-full h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold tracking-wide active:scale-[0.98] transition-all mt-2 disabled:opacity-40"
        >
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Set new password</h2>
          <p className="text-sm text-[var(--text-muted)]">Verifying reset link…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
