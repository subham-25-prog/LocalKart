'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clearSession, getStoredUser, setSession } from '@/lib/auth';
import { toast } from '@/lib/toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const requestedRole = searchParams.get('role') === 'seller' ? 'seller' : 'buyer';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = getStoredUser();
    if (savedUser?.role === requestedRole) {
      router.replace(callbackUrl);
      return;
    }
    if (savedUser && savedUser.role !== requestedRole) {
      clearSession(false);
      toast(`Switching to ${requestedRole} sign in`);
    }
  }, [router, callbackUrl, requestedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setSession({
        id: `local-user-${Date.now()}`,
        name: email.split('@')[0] || 'LocalKart Customer',
        email,
        phone: '',
        role: requestedRole,
        membership: requestedRole === 'seller' ? 'Merchant' : 'Member'
      });
      toast('Signed in successfully');
      router.replace(callbackUrl);
      setLoading(false);
    }, 450);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-zinc-900 p-6 border border-zinc-800 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-white">Sign in</h1>
        <p className="mb-5 text-center text-xs text-zinc-400">
          Continue to checkout, orders, and saved items.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
