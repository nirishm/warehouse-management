'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NoTenantActions() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
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
        {signingOut ? 'Signing out\u2026' : 'Sign Out'}
      </button>
    </div>
  );
}
