'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <Card className="border-border bg-[var(--bg-off)] backdrop-blur shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-foreground font-medium">Sign in</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[var(--text-muted)] text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted border-border text-foreground placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)] focus:ring-[var(--accent-color)]/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[var(--text-muted)] text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-muted border-border text-foreground placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)] focus:ring-[var(--accent-color)]/20"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-background font-semibold tracking-wide"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          <p className="text-sm text-muted-foreground">
            No account?{' '}
            <Link href="/register" className="text-[var(--accent-color)] hover:text-[var(--accent-color)] transition-colors">
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
