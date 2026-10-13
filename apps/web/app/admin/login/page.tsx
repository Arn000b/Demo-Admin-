import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/layout/AdminLoginForm';

export const metadata: Metadata = {
  title: { absolute: 'Admin Login | Anonna Mart' },
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
