'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function NoTenantPage() {
  const [email, setEmail] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending' | 'error'>('idle');
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();

    // Get user email for display
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });

    // Auto-create access request
    fetch('/api/access-requests', { method: 'POST' })
      .then((res) => {
        if (res.ok) setRequestStatus('pending');
        else setRequestStatus('error');
      })
      .catch(() => setRequestStatus('error'));
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-off)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="inline-flex items-center gap-2 font-mono text-sm font-bold tracking-[0.08em] text-[var(--text-primary)]">
            <span className="inline-block w-[22px] h-[22px] rounded-[5px] bg-[var(--accent-color)]" />
            WareOS
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 tracking-wide">Inventory Control System</p>
        </div>

        <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--text-dim)]/15 shadow-sm px-8 py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-tint)] flex items-center justify-center mx-auto mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="var(--accent-color)" strokeWidth="2"/>
              <path d="M12 7v5l3 3" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Access Pending</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
            Your account has been created. An administrator will review your request and assign you to a workspace.
          </p>
          {email && (
            <p className="text-sm text-[var(--text-body)] font-medium mb-6">{email}</p>
          )}
          {requestStatus === 'error' && (
            <p className="text-xs text-[var(--text-dim)] mb-6">
              Could not submit access request. Please try refreshing.
            </p>
          )}
          <Button
            onClick={handleSignOut}
            disabled={signingOut}
            variant="outline"
            className="h-10 rounded-full border-[var(--text-dim)]/40 text-[var(--text-muted)] hover:text-[var(--text-body)] hover:border-[var(--text-dim)] hover:bg-transparent font-medium px-6 transition-all"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </div>
    </div>
  );
}
