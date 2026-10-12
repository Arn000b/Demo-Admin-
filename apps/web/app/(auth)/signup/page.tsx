import type { Metadata } from 'next';
import { CustomerSignupForm } from '@/components/customer-auth/CustomerAuthForms';

export const metadata: Metadata = { title: 'Create account' };

export default function SignupPage() {
  return <CustomerSignupForm />;
}
