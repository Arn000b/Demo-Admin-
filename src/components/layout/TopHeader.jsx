import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Plus,
  Menu,
  CheckCheck,
  Package,
  ShoppingBag,
  Megaphone,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatTimeAgo } from '../../utils/formatters';

export function TopHeader({ onToggleSidebar }) {
  const {
    setIsSearchOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setIsAddProductOpen,
    setIsAddBannerOpen,
    setActiveTab
  } = useStore();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const quickRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (quickRef.current && !quickRef.current.contains(e.target)) {
        setIsQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shadow-xs">
      {/* Left side: Mobile Hamburger & Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-brand-900 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Global Search Pill Bar */}
        <div
          onClick={() => setIsSearchOpen(true)}
          className="w-full max-w-md flex items-center justify-between px-4 py-2.5 bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 rounded-2xl cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center gap-2.5 text-slate-400 group-hover:text-slate-600">
            <Search className="w-4 h-4 text-brand-900" />
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              Quick search products, orders, customers...
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
            <span>⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right side: Quick Add, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Add Button & Dropdown */}
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setIsQuickActionOpen(prev => !prev)}
            className="btn-primary py-2 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-gold-400 stroke-[2.5]" />
            <span className="hidden sm:inline">New Entry</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isQuickActionOpen ? 'rotate-180' : ''}`} />
          </button>

          {isQuickActionOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-slide-down">
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  setIsAddProductOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-brand-50 text-left text-xs font-semibold text-slate-700 hover:text-brand-900 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-800">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Add New Product</p>
                  <p className="text-[10px] text-slate-400 font-normal">Catalog item with SKU</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  setIsAddBannerOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gold-50/70 text-left text-xs font-semibold text-slate-700 hover:text-brand-900 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-gold-100 text-gold-800">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">New Promo Banner</p>
                  <p className="text-[10px] text-slate-400 font-normal">Homepage campaign</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(prev => !prev)}
            className="relative p-2.5 rounded-2xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 hover:text-brand-900 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-slide-down">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-semibold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1 hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !n.read ? 'bg-brand-50/30' : ''
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          n.type === 'order'
                            ? 'bg-emerald-100 text-emerald-800'
                            : n.type === 'inventory' || n.type === 'alert'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gold-100 text-gold-800'
                        }`}
                      >
                        {n.type === 'order' && <ShoppingBag className="w-4 h-4" />}
                        {(n.type === 'inventory' || n.type === 'alert') && <Package className="w-4 h-4" />}
                        {n.type === 'marketing' && <Megaphone className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold ${!n.read ? 'text-brand-950' : 'text-slate-700'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400">{formatTimeAgo(n.time)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(prev => !prev)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 transition-colors"
          >
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Admin Profile"
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-gold-400/80 shadow-xs"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-slate-800 leading-tight">Anonna Rahman</p>
              <p className="text-[10px] font-medium text-brand-700">Managing Director</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden md:block transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-slide-down">
              <div className="p-3 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">Anonna Rahman</p>
                <p className="text-[11px] text-slate-400 truncate">anonna@anonnamart.com</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gold-100 text-gold-900">
                  ★ Executive Admin
                </span>
              </div>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setActiveTab('settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 hover:text-brand-900 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Store Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setActiveTab('analytics');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 hover:text-brand-900 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span>Executive Reports</span>
              </button>

              <div className="border-t border-slate-100 my-1"></div>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  window.location.reload();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-xs font-medium text-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Logout Session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
