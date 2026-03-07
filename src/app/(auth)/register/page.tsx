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
      <Card className="border-zinc-800 bg-zinc-900/80 backdrop-blur shadow-2xl">
        <CardContent className="pt-6 text-center space-y-3">
          <div className="text-amber-500 text-4xl">✓</div>
          <h2 className="text-lg text-zinc-200 font-medium">Check your email</h2>
          <p className="text-sm text-zinc-400">
            We sent a confirmation link to <span className="text-zinc-200">{email}</span>
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/80 backdrop-blur shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-zinc-200 font-medium">Create account</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-zinc-400 text-sm">Full name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-400 text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold tracking-wide"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-500 hover:text-amber-400 transition-colors">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
