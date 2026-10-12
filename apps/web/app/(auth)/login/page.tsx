import type { Metadata } from 'next';
import { CustomerLoginForm } from '@/components/customer-auth/CustomerAuthForms';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return <CustomerLoginForm />;
}
