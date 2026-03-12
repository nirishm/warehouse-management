'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/login');
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-stone-900 mb-1">Set your password</h2>
      <p className="text-sm text-stone-500 mb-6">
        Create a secure password to complete your account setup.
      </p>
      <form onSubmit={handleSetPassword} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-bold text-stone-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-bold text-stone-700 mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm transition-colors"
        >
          {loading ? 'Setting password...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
}
