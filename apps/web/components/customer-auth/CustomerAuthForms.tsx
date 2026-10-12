'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const inputClass =
  'input-premium min-h-12 rounded-lg px-3 text-base aria-[invalid=true]:border-rose-600 aria-[invalid=true]:focus:ring-rose-600/20';
const loginInputClass =
  'min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 aria-[invalid=true]:border-rose-600 aria-[invalid=true]:focus:ring-rose-600/20';
const signupInputClass =
  'min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 aria-[invalid=true]:border-rose-600 aria-[invalid=true]:focus:ring-rose-600/20';
const buttonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';
const signupButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2';
const loginButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-900 px-4 text-sm font-semibold text-white transition duration-150 hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2';

function AuthNotice({ children }: { children: string }) {
  return (
    <p role="status" className="mt-5 flex items-start gap-2 rounded-lg border border-gold-300 bg-gold-50 p-3 text-sm leading-5 text-brand-950">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-800" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${className ?? inputClass} pr-12`}
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700"
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {error && <p id={errorId} role="alert" className="mt-1.5 text-sm text-rose-700">{error}</p>}
    </div>
  );
}

export function CustomerLoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      login();
      router.replace('/account');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Welcome back</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to continue to your account.</p>

      <form noValidate onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-800">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className={loginInputClass}
          />
          {errors.email && <p id="login-email-error" role="alert" className="mt-1.5 text-sm text-rose-700">{errors.email}</p>}
        </div>
        <PasswordInput
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
          className={loginInputClass}
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-brand-800 underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className={loginButtonClass}>Sign In</button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to Anonna Mart?{' '}
        <Link href="/signup" className="font-semibold text-brand-800 underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </div>
  );
}

export function CustomerSignupForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Enter your full name.';
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (password.length < 8 || !/\d/.test(password)) {
      nextErrors.password = 'Use at least 8 characters, including one number.';
    }
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      login({ name: name.trim(), email: email.trim() });
      router.replace('/account');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Create your account</h1>

      <form noValidate onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-slate-800">Full name</label>
          <input id="signup-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'signup-name-error' : undefined} className={signupInputClass} />
          {errors.name && <p id="signup-name-error" role="alert" className="mt-1.5 text-sm text-rose-700">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-slate-800">Email address</label>
          <input id="signup-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'signup-email-error' : undefined} className={signupInputClass} />
          {errors.email && <p id="signup-email-error" role="alert" className="mt-1.5 text-sm text-rose-700">{errors.email}</p>}
        </div>
        <PasswordInput id="signup-password" label="Password" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" className={signupInputClass} />
        <p className="-mt-4 text-xs leading-5 text-slate-500">Password requirements: at least 8 characters and 1 number.</p>
        <PasswordInput id="signup-confirm-password" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} error={errors.confirmPassword} autoComplete="new-password" className={signupInputClass} />
        <button type="submit" className={signupButtonClass}>Create account</button>
        <p className="text-center text-xs leading-5 text-slate-500">
          By creating an account, you agree to Anonna Mart&apos;s{' '}
          <Link href="/terms" className="font-medium text-brand-800 underline-offset-4 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="font-medium text-brand-800 underline-offset-4 hover:underline">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-800 underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

export function CustomerForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address.');
      setMessage('');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      setMessage('');
      return;
    }
    setError('');
    setMessage('Password recovery is not available yet. Please contact customer support for assistance.');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-brand-700">Account help</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Forgot your password?</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Enter your account email address. We’ll check the format, but password recovery is not connected yet.</p>
      <form noValidate onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-medium text-slate-800">Email address</label>
          <input id="recovery-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-invalid={Boolean(error)} aria-describedby={error ? 'recovery-email-error' : undefined} className={inputClass} />
          {error && <p id="recovery-email-error" role="alert" className="mt-1.5 text-sm text-rose-700">{error}</p>}
        </div>
        <button type="submit" className={buttonClass}>Continue</button>
      </form>
      {message && <AuthNotice>{message}</AuthNotice>}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-800 underline-offset-4 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
