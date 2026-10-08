import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Megaphone,
  BarChart3,
  Settings,
  Store,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function Sidebar({ isOpen, onClose }) {
  const { activeTab, setActiveTab, products, orders } = useStore();

  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;
  const lowStockCount = products.filter(p => p.stock <= (p.minStockAlert || 5)).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'products',
      label: 'Product Catalog',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} Alert` : `${products.length}`,
      badgeType: lowStockCount > 0 ? 'warning' : 'neutral'
    },
    {
      id: 'orders',
      label: 'Orders Management',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} New` : null,
      badgeType: 'accent'
    },
    {
      id: 'customers',
      label: 'Customers & Vendors',
      icon: Users,
      badge: null
    },
    {
      id: 'marketing',
      label: 'Marketing & Banners',
      icon: Megaphone,
      badge: 'Promo',
      badgeType: 'gold'
    },
    {
      id: 'analytics',
      label: 'Analytics & Insights',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'settings',
      label: 'Store Settings',
      icon: Settings,
      badge: null
    }
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-brand-950 text-white flex flex-col border-r border-brand-900/60 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 pb-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 p-0.5 shadow-gold-glow shrink-0">
              <div className="w-full h-full bg-brand-950 rounded-[14px] flex items-center justify-center">
                <span className="font-serif font-black text-xl text-gold-300">A</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-extrabold text-lg text-white tracking-wide">
                  ANONNA<span className="text-gold-400">MART</span>
                </h1>
              </div>
              <p className="text-[11px] font-medium text-emerald-300/80 uppercase tracking-widest">
                Admin Control Center
              </p>
            </div>
          </div>
        </div>

        {/* Store Live Status Banner */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-900/60 border border-brand-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-200 font-medium text-[11px]">Live Storefront</span>
            </div>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.open('https://anonnamart.com', '_blank'); }}
              className="text-gold-400 hover:text-gold-300 flex items-center gap-1 font-semibold text-[11px] hover:underline"
            >
              <span>Visit</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 py-4 overflow-y-auto space-y-1.5">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Main Management
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-900 to-brand-800 text-white shadow-lg border-l-4 border-gold-400'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-gold-400 text-brand-950 font-bold'
                        : 'text-slate-400 group-hover:text-gold-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm ${isActive ? 'font-semibold text-white' : ''}`}>
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.badgeType === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : item.badgeType === 'accent'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : item.badgeType === 'gold'
                        ? 'bg-gold-400/20 text-gold-300 border border-gold-400/30'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Admin Card */}
        <div className="p-4 border-t border-white/10 bg-brand-950/90">
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-brand-900/80 to-brand-900/40 border border-brand-800/80">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-1.5 rounded-lg bg-gold-400/20 text-gold-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Anonna Mart Pro</p>
                <p className="text-[10px] text-emerald-300/80">Fast SSL • Dhaka CDN</p>
              </div>
            </div>
            <div className="w-full bg-brand-950 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-gold-400 to-emerald-400 h-full w-4/5 rounded-full"></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-300 mt-2 font-medium">
              <span>DB Sync: Active</span>
              <span className="text-gold-300 font-bold">100% Health</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
