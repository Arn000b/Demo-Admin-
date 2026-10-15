'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
      const response = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Sign in failed.');
      const role = body?.data?.user?.role;
      if (role !== 'admin' && role !== 'vendor') {
        await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
        throw new Error('This console is available to administrator and vendor accounts.');
      }
      router.replace('/dashboard');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign in failed.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mb-6 text-sm text-slate-500">Sign in with your administrator or vendor account.</p>
      <form onSubmit={login} className="space-y-4">
        <div><label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label><input id="email" required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
        <div><label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label><input id="password" required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={busy} type="submit" className="h-10 w-full rounded-lg bg-emerald-900 px-4 font-semibold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
