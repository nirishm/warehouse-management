'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/access-requests', label: 'Access Requests' },
];

export function AdminHeader({ email }: { email: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : '??';

  return (
    <header
      className="border-b border-[var(--border)] px-6 py-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1
          style={{ color: 'var(--text-primary)' }}
          className="text-[17px] font-bold"
        >
          WareOS Admin
        </h1>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: pathname.startsWith(link.href)
                    ? 'var(--accent-color)'
                    : 'var(--text-muted)',
                }}
                className={`text-[14px] hover:underline ${
                  pathname.startsWith(link.href) ? 'font-bold' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-4">
            <span
              style={{
                backgroundColor: 'var(--accent-tint)',
                color: 'var(--accent-color)',
                borderRadius: '9999px',
                width: '36px',
                height: '36px',
              }}
              className="flex items-center justify-center text-[13px] font-bold shrink-0"
              title={email}
            >
              {initials}
            </span>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-[13px] gap-2"
            >
              <LogOut className="size-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
