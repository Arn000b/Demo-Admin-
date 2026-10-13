import type { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: { absolute: 'Customer Management | Anonna Mart' },
};

export default function AdminCustomersPage() {
  return <DashboardShell />;
}
