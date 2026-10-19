'use client';

<<<<<<< HEAD
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
=======
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
>>>>>>> feature/my-new-code
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { SearchPalette } from '@/components/common/SearchPalette';
import { useStore } from '@/components/providers/StoreContext';

// Page modules
<<<<<<< HEAD
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { ProductListView } from '@/components/products/ProductListView';
import { FeaturedProductsManagement } from '@/components/products/FeaturedProductsManagement';
import { OrderListView } from '@/components/orders/OrderListView';
import { CustomerListView } from '@/components/customers/CustomerListView';
=======
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminRecords } from '@/components/admin/AdminRecords';
>>>>>>> feature/my-new-code
import { MarketingManagement } from '@/components/marketing/MarketingManagement';
import { DetailedAnalyticsView } from '@/components/analytics/DetailedAnalyticsView';
import { StoreSettingsView } from '@/components/settings/StoreSettingsView';
import { VendorManagement } from '@/components/vendors/VendorManagement';
import { VendorWorkspace } from '@/components/vendors/VendorWorkspace';
import { SignOutButton } from '@/components/auth/SignOutButton';

// Modals
import { AddProductModal } from '@/components/products/AddProductModal';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { InvoicePrintModal } from '@/components/orders/InvoicePrintModal';
import { BannerEditModal } from '@/components/marketing/BannerEditModal';
import { CreateCouponModal } from '@/components/marketing/CreateCouponModal';
import { ProfileEditModal } from '@/components/profile/ProfileEditModal';
import { Logo } from '@/components/common/Logo';

export function DashboardShell() {
  const { activeTab } = useStore();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
<<<<<<< HEAD
  const adminRouteViews: Record<string, ReactNode> = {
    '/admin': <DashboardOverview />,
    '/admin/products': <ProductListView />,
    '/admin/orders': <OrderListView />,
    '/admin/customers': <CustomerListView />,
  };
  const routeView = adminRouteViews[pathname];
=======
  const [access, setAccess] = useState<'loading' | 'admin' | 'vendor' | 'denied'>('loading');
  const router = useRouter();

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    let active = true;
    fetch(`${api}/auth/me`, { credentials: 'include' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((body) => {
        if (!active) return;
        const role = body?.data?.user?.role;
        if (role === 'admin' || role === 'vendor') setAccess(role);
        else { setAccess('denied'); router.replace('/login'); }
      })
      .catch(() => { if (active) { setAccess('denied'); router.replace('/login'); } });
    return () => { active = false; };
  }, [router]);

  if (access === 'loading' || access === 'denied') return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">Checking your account…</main>;
  if (access === 'vendor') return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-7xl"><div className="mb-5 flex justify-end"><SignOutButton /></div><VendorWorkspace /></div></main>;
>>>>>>> feature/my-new-code

  return (
    <div className="min-h-screen bg-[#F4F7F5] flex flex-col font-sans">
      {/* Fixed Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="xl:pl-72 flex flex-col flex-1 min-h-screen">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white pr-4 sm:pr-8"><div className="min-w-0 flex-1"><TopHeader onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} /></div><div className="pl-2"><SignOutButton /></div></div>

        {/* Dynamic Page View Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-16">
<<<<<<< HEAD
          {pathname === '/admin/featured' ? <FeaturedProductsManagement /> : routeView || (
            <>
              {activeTab === 'dashboard' && <DashboardOverview />}
              {activeTab === 'products' && <ProductListView />}
              {activeTab === 'orders' && <OrderListView />}
              {activeTab === 'customers' && <CustomerListView />}
              {activeTab === 'marketing' && <MarketingManagement />}
              {activeTab === 'analytics' && <DetailedAnalyticsView />}
              {activeTab === 'settings' && <StoreSettingsView />}
            </>
          )}
=======
          {['marketing', 'analytics', 'settings'].includes(activeTab) && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">This legacy screen still uses local sample data and is not connected to live records.</div>}
          {activeTab === 'dashboard' && <AdminOverview />}
          {activeTab === 'products' && <AdminRecords kind="products" />}
          {activeTab === 'orders' && <AdminRecords kind="orders" />}
          {activeTab === 'customers' && <AdminRecords kind="customers" />}
          {activeTab === 'marketing' && <MarketingManagement />}
          {activeTab === 'analytics' && <DetailedAnalyticsView />}
          {activeTab === 'settings' && <StoreSettingsView />}
          {activeTab === 'vendors' && <VendorManagement />}
>>>>>>> feature/my-new-code
        </main>

        {/* Global Footer */}
        {pathname !== '/admin/featured' && (
          <footer className="py-5 px-8 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/50 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <Logo width={136} height={60} />
                <p className="font-medium text-slate-500">
                  © 2026 — High-Performance E-Commerce Control Center
                </p>
              </div>
              <p className="text-[11px] text-slate-400">
                Aesthetic Forest Green (#0F3821) & Gold (#D4AF37) Edition • v2.4.0 Pro
              </p>
            </div>
          </footer>
        )}
      </div>

      {/* Modals and Overlays */}
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
