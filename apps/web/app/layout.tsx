import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/providers/StoreContext';
import { CustomerDemoProvider } from '@/components/providers/CustomerDemoContext';
import { AuthProvider } from '@/context/auth-context';
import { ToastContainer } from '@/components/common/Toast';

export const metadata: Metadata = {
  title: {
    default: 'Anonna Mart Admin',
    template: '%s | Anonna Mart Admin',
  },
  description: 'Anonna Mart — High-Performance E-Commerce Control Center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
<<<<<<< HEAD
    <html lang="en" className={`light ${inter.variable}`}>
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
=======
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
>>>>>>> feature/my-new-code
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
