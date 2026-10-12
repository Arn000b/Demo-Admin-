import type { Metadata } from 'next';
import { Button, Input } from '@repo/ui';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-900">
      <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Sign in to your account to continue.
      </p>

      <form className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          className="h-10 py-2"
        />
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          className="h-10 py-2"
        />

        <Button
          type="submit"
          className="h-10 w-full py-2.5 font-semibold"
        >
          Sign in
        </Button>
      </form>
    </div>
  );
}
