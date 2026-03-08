'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
      <Card className="border-border bg-[var(--bg-off)] backdrop-blur shadow-2xl">
        <CardContent className="pt-6 text-center space-y-3">
          <div className="text-[var(--accent-color)] text-4xl">✓</div>
          <h2 className="text-lg text-foreground font-medium">Check your email</h2>
          <p className="text-sm text-[var(--text-muted)]">
            We sent a confirmation link to <span className="text-foreground">{email}</span>
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-4 border-border text-[var(--text-body)] hover:bg-muted">
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-[var(--bg-off)] backdrop-blur shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-foreground font-medium">Create account</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-[var(--text-muted)] text-sm">Full name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-muted border-border text-foreground placeholder:text-[var(--text-dim)] focus:border-[var(--accent-color)] focus:ring-[var(--accent-color)]/20"
            />
          </div>
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
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent-color)] hover:text-[var(--accent-color)] transition-colors">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
