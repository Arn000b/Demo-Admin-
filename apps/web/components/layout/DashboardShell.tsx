'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { SearchPalette } from '@/components/common/SearchPalette';
import { ToastContainer } from '@/components/common/Toast';
import { useStore } from '@/components/providers/StoreContext';

// Page modules
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { ProductListView } from '@/components/products/ProductListView';
import { OrderListView } from '@/components/orders/OrderListView';
import { CustomerListView } from '@/components/customers/CustomerListView';
import { MarketingManagement } from '@/components/marketing/MarketingManagement';
import { DetailedAnalyticsView } from '@/components/analytics/DetailedAnalyticsView';
import { StoreSettingsView } from '@/components/settings/StoreSettingsView';

// Modals
import { AddProductModal } from '@/components/products/AddProductModal';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { InvoicePrintModal } from '@/components/orders/InvoicePrintModal';
import { BannerEditModal } from '@/components/marketing/BannerEditModal';
import { CreateCouponModal } from '@/components/marketing/CreateCouponModal';
import { ProfileEditModal } from '@/components/profile/ProfileEditModal';

export function DashboardShell() {
  const { activeTab } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F7F5] flex flex-col font-sans">
      {/* Fixed Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="xl:pl-72 flex flex-col flex-1 min-h-screen">
        {/* Top Header Navigation */}
        <TopHeader onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        {/* Dynamic Page View Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-16">
          {activeTab === 'dashboard' && <DashboardOverview />}
          {activeTab === 'products' && <ProductListView />}
          {activeTab === 'orders' && <OrderListView />}
          {activeTab === 'customers' && <CustomerListView />}
          {activeTab === 'marketing' && <MarketingManagement />}
          {activeTab === 'analytics' && <DetailedAnalyticsView />}
          {activeTab === 'settings' && <StoreSettingsView />}
        </main>

        {/* Global Footer */}
        <footer className="py-5 px-8 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <p className="font-medium text-slate-500">
              © 2026 <strong>Anonna Mart</strong> — High-Performance E-Commerce Control Center
            </p>
            <p className="text-[11px] text-slate-400">
              Aesthetic Forest Green (#0F3821) & Gold (#D4AF37) Edition • v2.4.0 Pro
            </p>
          </div>
        </footer>
      </div>

      {/* Modals and Overlays */}
      <SearchPalette />
      <ToastContainer />
      <AddProductModal />
      <OrderDetailModal />
      <InvoicePrintModal />
      <BannerEditModal />
      <CreateCouponModal />
      <ProfileEditModal />
    </div>
  );
}
