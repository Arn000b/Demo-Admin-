'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, LockKeyhole, Mail, User } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';

const loginInputClass =
  'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/15';

const loginButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

const signupInputClass =
  'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/15';

const signupButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

const inputClass =
  'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/15';

const buttonClass =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

function AuthNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mt-5 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-5 text-amber-950 sm:text-sm sm:leading-6"
    >
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-900" aria-hidden="true" />
        <div>{children}</div>
      </div>
    </div>
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
  className: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${className} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function CustomerLoginForm() {
  const router = useRouter();
  const { login, logout: clearCustomerLogin } = useAuth();
  const { signOut: clearCustomerData } = useCustomerDemo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (!result.success) {
        // Fallback check: emergency admin credentials on Next.js route
        const adminResp = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ username: email.trim(), password }),
        }).catch(() => null);

        if (adminResp && adminResp.ok) {
          clearCustomerLogin();
          clearCustomerData();
          router.replace('/admin');
          return;
        }

        setSubmitError(result.error ?? 'Invalid email or password.');
        setIsSubmitting(false);
        return;
      }

      if (result.role === 'admin' || result.role === 'vendor') {
        // Establish admin cookie for Next.js route middleware as well
        await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ username: email.trim(), password }),
        }).catch(() => null);

        clearCustomerLogin();
        clearCustomerData();
        router.replace('/admin');
        return;
      }

      router.replace('/account');
    } catch (error) {
      console.error('Unable to complete sign-in.', error);
      setSubmitError('Unable to reach the sign-in service. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Welcome back</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to continue to your account.</p>

      <form noValidate onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-800">
            Email address
          </label>
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
          {errors.email && (
            <p id="login-email-error" role="alert" className="mt-1.5 text-sm text-rose-700">
              {errors.email}
            </p>
          )}
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
          <Link
            href="/forgot-password"
            className="text-brand-800 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        {submitError && (
          <p role="alert" className="text-sm text-rose-700">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${loginButtonClass} disabled:cursor-wait disabled:opacity-60`}
        >
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to Anonna Mart?{' '}
        <Link
          href="/signup"
          className="text-brand-800 font-semibold underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function CustomerSignupForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
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
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await register({
        fullName: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });

      if (!result.success) {
        setSubmitError(result.error ?? 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      router.replace('/account');
    } catch {
      setSubmitError('Unable to reach the registration service. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Create your account</h1>

      <form noValidate onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-slate-800">
            Full name
          </label>
          <input
            id="signup-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'signup-name-error' : undefined}
            className={signupInputClass}
          />
          {errors.name && (
            <p id="signup-name-error" role="alert" className="mt-1.5 text-sm text-rose-700">
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-slate-800">
            Email address
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
            className={signupInputClass}
          />
          {errors.email && (
            <p id="signup-email-error" role="alert" className="mt-1.5 text-sm text-rose-700">
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="signup-phone" className="mb-1.5 block text-sm font-medium text-slate-800">
            Phone number (optional)
          </label>
          <input
            id="signup-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={signupInputClass}
            placeholder="+880 1XXX-XXXXXX"
          />
        </div>
        <PasswordInput
          id="signup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="new-password"
          className={signupInputClass}
        />
        <p className="-mt-4 text-xs leading-5 text-slate-500">
          Password requirements: at least 8 characters and 1 number.
        </p>
        <PasswordInput
          id="signup-confirm-password"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
          autoComplete="new-password"
          className={signupInputClass}
        />
        {submitError && (
          <p role="alert" className="text-sm text-rose-700">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${signupButtonClass} disabled:cursor-wait disabled:opacity-60`}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-center text-xs leading-5 text-slate-500">
          By creating an account, you agree to Anonna Mart&apos;s{' '}
          <Link
            href="/terms"
            className="text-brand-800 font-medium underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="text-brand-800 font-medium underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-brand-800 font-semibold underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function CustomerForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
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
    setIsSubmitting(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
      const response = await fetch(`${api}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (body?.success || response.ok) {
        setMessage(
          'If an account exists for this email, you will receive password reset instructions.'
        );
      } else {
        setMessage(body?.error ?? 'Unable to request password reset. Please try again later.');
      }
    } catch {
      setMessage(
        'If an account exists for this email, you will receive password reset instructions.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <p className="text-brand-700 text-sm font-semibold">Account help</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        Forgot your password?
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter your account email address to receive password recovery instructions.
      </p>
      <form noValidate onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="recovery-email"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            Email address
          </label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'recovery-email-error' : undefined}
            className={inputClass}
          />
          {error && (
            <p id="recovery-email-error" role="alert" className="mt-1.5 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${buttonClass} disabled:opacity-60`}
        >
          {isSubmitting ? 'Submitting…' : 'Continue'}
        </button>
      </form>
      {message && <AuthNotice>{message}</AuthNotice>}
      <p className="mt-6 text-center text-sm">
        <Link
          href="/login"
          className="text-brand-800 font-semibold underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
