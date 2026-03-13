'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PostOAuthPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function syncAndRedirect() {
      try {
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`sync returned ${res.status}`);
        }
        const body = await res.json();

        if (body.tenant_slug) {
          router.replace(`/t/${body.tenant_slug}`);
        } else if (body.is_super_admin) {
          router.replace('/admin');
        } else {
          router.replace('/no-tenant');
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        console.error('[post-oauth] sync failed:', e);
        setError('Sign-in failed. Please try again.');
      }
    }

    syncAndRedirect();
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <a
          href="/login"
          className="text-orange-500 hover:text-orange-600 text-sm font-bold"
        >
          Back to login
        </a>
      </div>
    );
  }

  return (
    <p className="text-center text-stone-500 text-sm">
      Signing you in…
    </p>
  );
}
