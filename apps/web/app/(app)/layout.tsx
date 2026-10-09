import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

/**
 * (app) route group layout.
 *
 * The actual shell (Sidebar, TopHeader, SearchPalette, Toasts, Modals)
 * is rendered by the DashboardShell client component to keep this
 * Server Component boundary clean.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
