import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Logo } from '@/components/common/Logo';

export const metadata: Metadata = {
  title: {
    default: 'Customer account',
    template: '%s | Anonna Mart',
  },
};

/**
 * Auth route group layout — centered card layout for login/register/forgot-password pages.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fcf9f2] px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
<<<<<<< HEAD
        <div className="mb-10 text-center">
          <Logo width={224} height={100} className="mx-auto" variant="wordmark" />
=======
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-emerald-900">ANONNA MART</span>
>>>>>>> feature/my-new-code
        </div>
        {children}
      </div>
    </div>
  );
}
