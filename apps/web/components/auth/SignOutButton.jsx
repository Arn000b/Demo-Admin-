'use client';

import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    try { await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' }); }
    catch { /* Always leave the protected console if the API is unavailable. */ }
    finally { router.replace('/login'); }
  }
  return <button type="button" onClick={() => void signOut()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign out</button>;
}
