import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-900">
      <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Sign in to your account to continue.
      </p>

      <form className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none ring-offset-2 transition focus:ring-2 focus:ring-brand-500 dark:bg-gray-800"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none ring-offset-2 transition focus:ring-2 focus:ring-brand-500 dark:bg-gray-800"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
