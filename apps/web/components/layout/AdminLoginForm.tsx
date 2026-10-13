'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/auth-context';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';

const inputClass =
  'min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15';

export function AdminLoginForm() {
  const router = useRouter();
  const { logout: clearCustomerLogin } = useAuth();
  const { signOut: clearCustomerData } = useCustomerDemo();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        const message =
          typeof result === 'object' &&
          result !== null &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Login failed. Check your credentials and try again.';
        setError(message);
        setIsSubmitting(false);
        return;
      }

      window.localStorage.removeItem('admin_session');
      clearCustomerLogin();
      clearCustomerData();
      router.replace('/admin');
    } catch (requestError) {
      console.error('Unable to complete admin sign-in.', requestError);
      setError('Unable to reach the sign-in service. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f5] px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-emerald-950/5 md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#0e4e3e] p-10 text-white md:flex">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border border-[#D4AF37]/25" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-[#D4AF37]/20" />
          <Logo width={165} height={72} href={null} className="z-10 rounded-xl bg-white p-2" />
          <div className="relative z-10">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-white/10 text-[#D4AF37]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-6 max-w-sm text-3xl font-bold leading-tight">Good to have you back.</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-emerald-100/80">
              Sign in to manage your catalog, orders, customers, and store experience.
            </p>
          </div>
          <p className="relative z-10 text-xs text-emerald-100/60">Anonna Mart · Admin workspace</p>
        </div>

        <div className="p-6 sm:p-10">
          <div className="md:hidden"><Logo width={145} height={64} href={null} /></div>
          <div className="mt-6 md:mt-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Admin portal</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Sign in to your account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter your administrator username or email and password to continue.</p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="admin-username" className="mb-1.5 block text-sm font-semibold text-slate-800">Username or email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="admin-username" type="text" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username or email" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-slate-800">Password</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className={inputClass} />
              </div>
            </div>
            {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? 'Logging in…' : <>Login <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#D4AF37]/35 bg-amber-50/70 p-4">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
            <p className="text-xs leading-5 text-amber-950">
              Admin credentials are configured securely on the server.
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Anonna Mart administrator access</p>
        </div>
      </section>
    </main>
  );
}
