import type { Metadata } from 'next';
import { CustomerForgotPasswordForm } from '@/components/customer-auth/CustomerAuthForms';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return <CustomerForgotPasswordForm />;
}
