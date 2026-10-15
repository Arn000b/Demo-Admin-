import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/providers/StoreContext';

export const metadata: Metadata = {
  title: {
    default: 'Anonna Mart Admin',
    template: '%s | Anonna Mart Admin',
  },
  description: 'Anonna Mart — High-Performance E-Commerce Control Center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
