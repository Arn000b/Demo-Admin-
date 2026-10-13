import type { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: { absolute: 'Admin Dashboard | Anonna Mart' },
};

export default function AdminDashboardPage() {
  return <DashboardShell />;
}
