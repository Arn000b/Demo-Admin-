import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CustomerAccountLayout } from '@/components/customer-account/CustomerAccountLayout';

export const metadata: Metadata = {
  title: {
    default: 'Customer account',
    template: '%s | Anonna Mart',
  },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <CustomerAccountLayout>{children}</CustomerAccountLayout>;
}
