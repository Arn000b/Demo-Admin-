import type { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: { absolute: 'Product Management | Anonna Mart' },
};

export default function AdminProductsPage() {
  return <DashboardShell />;
}
