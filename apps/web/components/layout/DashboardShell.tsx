'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { SearchPalette } from '@/components/common/SearchPalette';
import { useStore } from '@/components/providers/StoreContext';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminRecords } from '@/components/admin/AdminRecords';
import { FeaturedProductsManagement } from '@/components/products/FeaturedProductsManagement';
import { MarketingManagement } from '@/components/marketing/MarketingManagement';
import { DetailedAnalyticsView } from '@/components/analytics/DetailedAnalyticsView';
import { StoreSettingsView } from '@/components/settings/StoreSettingsView';
import { VendorManagement } from '@/components/vendors/VendorManagement';
import { VendorWorkspace } from '@/components/vendors/VendorWorkspace';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { AddProductModal } from '@/components/products/AddProductModal';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { InvoicePrintModal } from '@/components/orders/InvoicePrintModal';
import { BannerEditModal } from '@/components/marketing/BannerEditModal';
import { CreateCouponModal } from '@/components/marketing/CreateCouponModal';
import { ProfileEditModal } from '@/components/profile/ProfileEditModal';
import { Logo } from '@/components/common/Logo';

type Access = 'loading' | 'admin' | 'vendor' | 'denied';

export function DashboardShell() {
  const { activeTab } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [access, setAccess] = useState<Access>('loading');

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    let active = true;

    async function checkAuth() {
      // 1. First check if web admin session cookie is valid
      try {
        const sessionRes = await fetch('/api/admin/session', { credentials: 'same-origin' });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json().catch(() => null);
          if (sessionData?.isAdmin) {
            if (active) setAccess('admin');
            return;
          }
        }
      } catch {
        // Fall through to backend API
      }

      // 2. Check backend API session
      try {
        const response = await fetch(`${api}/auth/me`, { credentials: 'include' });
        if (response.ok) {
          const body = await response.json().catch(() => null);
          const role = body?.data?.user?.role;
          if (role === 'admin' || role === 'vendor') {
            if (active) setAccess(role);
            return;
          }
        }
      } catch {
        // Backend offline
      }

      if (active) {
        setAccess('denied');
        router.replace('/admin/login');
      }
    }

    void checkAuth();
    return () => {
      active = false;
    };
  }, [router]);

  if (access === 'loading' || access === 'denied') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Checking your account…
      </main>
    );
  }

  if (access === 'vendor') {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex justify-end">
            <SignOutButton />
          </div>
          <VendorWorkspace />
        </div>
      </main>
    );
  }

  const adminRouteViews: Record<string, ReactNode> = {
    '/admin': <AdminOverview />,
    '/admin/products': <AdminRecords kind="products" />,
    '/admin/orders': <AdminRecords kind="orders" />,
    '/admin/customers': <AdminRecords kind="customers" />,
    '/admin/featured': <FeaturedProductsManagement />,
  };
  const routeView = adminRouteViews[pathname];

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F7F5] font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col xl:pl-72">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white pr-4 sm:pr-8">
          <div className="min-w-0 flex-1">
            <TopHeader onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
          </div>
          <div className="pl-2">
            <SignOutButton />
          </div>
        </div>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-16 sm:p-8">
          {['marketing', 'analytics', 'settings'].includes(activeTab) && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This legacy screen still uses local sample data and is not connected to live records.
            </div>
          )}
          {routeView ?? (
            <>
              {activeTab === 'dashboard' && <AdminOverview />}
              {activeTab === 'products' && <AdminRecords kind="products" />}
              {activeTab === 'orders' && <AdminRecords kind="orders" />}
              {activeTab === 'customers' && <AdminRecords kind="customers" />}
              {activeTab === 'marketing' && <MarketingManagement />}
              {activeTab === 'analytics' && <DetailedAnalyticsView />}
              {activeTab === 'settings' && <StoreSettingsView />}
              {activeTab === 'vendors' && <VendorManagement />}
            </>
          )}
        </main>

        {pathname !== '/admin/featured' && (
          <footer className="border-t border-slate-200/80 bg-white/50 px-8 py-5 text-center text-xs text-slate-400 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <Logo width={136} height={60} />
                <p className="font-medium text-slate-500">
                  © 2026 — High-Performance E-Commerce Control Center
                </p>
              </div>
              <p className="text-[11px] text-slate-400">
                Aesthetic Forest Green (#0F3821) &amp; Gold (#D4AF37) Edition · v2.4.0 Pro
              </p>
            </div>
          </footer>
        )}
      </div>

      <SearchPalette />
      <AddProductModal />
      <OrderDetailModal />
      <InvoicePrintModal />
      <BannerEditModal />
      <CreateCouponModal />
      <ProfileEditModal />
    </div>
  );
}
