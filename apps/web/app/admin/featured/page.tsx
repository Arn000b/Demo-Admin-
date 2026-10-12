import type { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: 'Featured Picks Management',
};

export default function FeaturedProductsPage() {
  return <DashboardShell />;
}
