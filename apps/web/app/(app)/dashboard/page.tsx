import type { Metadata } from 'next';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Main dashboard entry point.
 * DashboardShell is a client component that renders the full SPA-like layout:
 * sidebar, header, tab-based routing, modals, and toasts.
 */
export default function DashboardPage() {
  return <DashboardShell />;
}
