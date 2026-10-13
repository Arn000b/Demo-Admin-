import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/providers/StoreContext';
import { CustomerDemoProvider } from '@/components/providers/CustomerDemoContext';
import { AuthProvider } from '@/context/auth-context';
import { ToastContainer } from '@/components/common/Toast';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Anonna Mart Admin',
    template: '%s | Anonna Mart Admin',
  },
  description: 'Anonna Mart — High-Performance E-Commerce Control Center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`light ${inter.variable}`}>
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
        <StoreProvider>
          <AuthProvider>
            <CustomerDemoProvider>
              {children}
              <ToastContainer />
            </CustomerDemoProvider>
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
