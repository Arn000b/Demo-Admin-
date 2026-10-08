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
  Sparkles
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
    setActiveTab,
    setIsProfileEditOpen,
    profile
  } = useStore();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const quickRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const shortcutLabel = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    ? '⌘ K'
    : 'Ctrl K';

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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-3 shadow-sm backdrop-blur-md sm:px-6">
      {/* Global navigation and search */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 xl:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="group flex h-11 min-w-0 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left transition-colors hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:gap-3 sm:px-3.5 xl:min-w-[360px] xl:max-w-[460px]"
          aria-label="Open global search"
          aria-keyshortcuts={shortcutLabel.replace(' ', '')}
        >
          <Search className="h-[18px] w-[18px] shrink-0 text-brand-800" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-500 sm:text-sm">
            <span className="sm:hidden">Search...</span>
            <span className="hidden sm:inline">Search products, orders, customers...</span>
          </span>
        </button>
      </div>

      {/* Global actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {/* Quick Add Button & Dropdown */}
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setIsQuickActionOpen(prev => !prev)}
            className="btn-primary h-10 gap-1.5 rounded-xl px-2.5 text-xs font-semibold focus-visible:ring-offset-2 sm:gap-2 sm:px-4 sm:text-sm"
            aria-expanded={isQuickActionOpen}
            aria-label="Create new entry"
          >
            <Plus className="h-4 w-4 text-gold-400 stroke-[2.5]" />
            <span className="hidden sm:inline">New Entry</span>
            <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform duration-200 sm:block ${isQuickActionOpen ? 'rotate-180' : ''}`} />
          </button>

          {isQuickActionOpen && (
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-slide-down" role="region" aria-label="Create new entry options">
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
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={isNotifOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 z-50 mt-3 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-slide-down" role="region" aria-label="Notifications">
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
                    className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded"
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
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`w-full p-3.5 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700 ${
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
                    </button>
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
            className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:pr-2.5"
            aria-label={`Account menu for ${profile.name}`}
            aria-expanded={isProfileOpen}
          >
            <div className="relative">
              <img
                src={profile.avatar}
                alt=""
                className="h-9 w-9 rounded-xl object-cover ring-1 ring-gold-500/60 sm:h-10 sm:w-10"
              />
              <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="hidden text-left md:block">
              <p className="max-w-28 truncate text-xs font-bold leading-tight text-slate-800">{profile.name}</p>
              <p className="max-w-28 truncate text-[10px] font-medium text-brand-700">{profile.role}</p>
            </div>
            <ChevronDown className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform duration-200 md:block ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 z-50 mt-3 w-60 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-slide-down" role="region" aria-label="Account menu">
              <div className="p-3 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">{profile.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{profile.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gold-100 text-gold-900">
                  ★ {profile.role}
                </span>
              </div>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsProfileEditOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 hover:text-brand-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              >
                <User className="w-4 h-4 text-brand-600" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setActiveTab('settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 hover:text-brand-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Store Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  setActiveTab('analytics');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 hover:text-brand-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
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
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-xs font-medium text-rose-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
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
