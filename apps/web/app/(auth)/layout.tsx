import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    default: 'Auth',
    template: '%s | Auth',
  },
};

/**
 * Auth route group layout — centered card layout for login/register/forgot-password pages.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">YourBrand</span>
        </div>
        {children}
      </div>
    </div>
  );
}
