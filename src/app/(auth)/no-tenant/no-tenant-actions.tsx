'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NoTenantActions() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    async function createAccessRequest() {
      try {
        setRequestStatus('sending');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRequestStatus('error');
          return;
        }

        const res = await fetch('/api/v1/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: user.email }),
        });

        if (res.ok) {
          setRequestStatus('sent');
        } else {
          console.error('[no-tenant] access request failed:', res.status);
          setRequestStatus('error');
        }
      } catch (err) {
        console.error('[no-tenant] access request error:', err);
        setRequestStatus('error');
      }
    }

    createAccessRequest();
  }, []);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {requestStatus === 'sent' && (
        <p style={{ color: 'var(--accent-color)' }} className="text-[13px] font-bold">
          Access request submitted successfully.
        </p>
      )}
      {requestStatus === 'error' && (
        <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">
          Could not submit access request automatically. Please contact an administrator.
        </p>
      )}
      <Link
        href="/"
        className="inline-flex h-[48px] items-center justify-center rounded-full text-[14px] font-bold text-white"
        style={{ backgroundColor: 'var(--accent-color)' }}
      >
        Try Again
      </Link>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex h-[48px] items-center justify-center rounded-full text-[14px] font-bold"
        style={{
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
        }}
      >
        {signingOut ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  );
}
