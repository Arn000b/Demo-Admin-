import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Megaphone,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';
import { useStore } from '@/components/providers/StoreContext';

export function Sidebar({ isOpen, onClose }) {
  const { activeTab, setActiveTab, products, orders } = useStore();

  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;
  const lowStockCount = products.filter(p => p.stock <= (p.minStockAlert || 5)).length;

  const navGroups = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null }
      ]
    },
    {
      title: 'Sales',
      items: [
        { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} New` : null, badgeType: 'warning' },
        { id: 'customers', label: 'Customers', icon: Users, badge: null }
      ]
    },
    {
      title: 'Catalog',
      items: [
        { id: 'products', label: 'Products', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} Low` : null, badgeType: 'warning' }
      ]
    },
    {
      title: 'Marketing',
      items: [
        { id: 'marketing', label: 'Marketing', icon: Megaphone, badge: null }
      ]
    },
    {
      title: 'Analytics',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Store Settings', icon: Settings, badge: null }
      ]
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
          className="fixed inset-0 z-40 bg-brand-950/70 backdrop-blur-sm xl:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-brand-900/60 bg-brand-950 text-white shadow-2xl transition-transform duration-300 ease-in-out xl:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 p-0.5 shadow-gold-glow">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-brand-950">
                <span className="font-serif text-lg font-black text-gold-300">A</span>
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
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 xl:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        {/* Navigation */}
        <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-0.5">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400/90">
                {group.title}
              </p>

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 font-medium text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                      isActive
                        ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-gold-300' : 'text-slate-400 group-hover:text-gold-300'}`} />
                      <span className={isActive ? 'font-semibold text-white' : ''}>
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
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span>All systems operational</span>
          </div>
        </div>
      </aside>
    </>
  );
}
