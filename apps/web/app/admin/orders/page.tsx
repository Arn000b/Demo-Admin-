import type { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: { absolute: 'Order Management | Anonna Mart' },
};

export default function AdminOrdersPage() {
  return <DashboardShell />;
}
