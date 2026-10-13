'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, LayoutDashboard, LogOut, Package, User } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useStore } from '@/components/providers/StoreContext';

export function CustomerProfileMenu() {
  const { user, isLoading, logout } = useAuth();
  const { signOut: clearCustomerState } = useCustomerDemo();
  const { profile: adminProfile } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adminSessionStatus, setAdminSessionStatus] = useState<
    'checking' | 'admin' | 'customer' | 'error'
  >('checking');
  const [signOutError, setSignOutError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const profile = adminSessionStatus === 'admin' ? adminProfile : user;
  const profileName: string = typeof profile?.name === 'string' ? profile.name : '';
  const initials = profileName
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase();

  useEffect(() => {
    let active = true;

    const checkAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/session', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Admin session check failed with status ${response.status}.`);
        }
        const result: unknown = await response.json();
        if (
          typeof result !== 'object' ||
          result === null ||
          !('isAdmin' in result) ||
          typeof result.isAdmin !== 'boolean'
        ) {
          throw new Error('Admin session check returned an invalid response.');
        }
        if (active) setAdminSessionStatus(result.isAdmin ? 'admin' : 'customer');
      } catch (error) {
        console.error('Unable to check the current admin session.', error);
        if (active) setAdminSessionStatus('error');
      }
    };

    void checkAdminSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const closeMenu = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setOpen(false);
      }
      if (
        event instanceof MouseEvent &&
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeMenu);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeMenu);
    };
  }, [open]);

  const handleSignOut = async () => {
    setSignOutError('');
    if (adminSessionStatus === 'admin') {
      try {
        const response = await fetch('/api/admin/logout', {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (!response.ok) {
          throw new Error(`Admin logout failed with status ${response.status}.`);
        }
        setAdminSessionStatus('customer');
      } catch (error) {
        console.error('Unable to log out of the admin session.', error);
        setSignOutError('Unable to end your admin session. Please try again.');
        return;
      }
    }
    logout();
    clearCustomerState();
    setOpen(false);
    router.replace('/');
    router.refresh();
  };

  if (isLoading || adminSessionStatus === 'checking') {
    return <span className="inline-flex h-10 w-[88px] animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />;
  }

  if (adminSessionStatus === 'error') {
    return <span role="alert" className="text-xs font-medium text-rose-700">Unable to verify admin session</span>;
  }

  if (adminSessionStatus === 'admin') {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="admin-profile-dropdown"
          aria-label="Open admin profile menu"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-left transition-colors hover:border-emerald-600/40 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
            {profile?.avatar && <Image src={profile.avatar} alt="" fill sizes="36px" className="object-cover" unoptimized />}
          </span>
          <span className="hidden max-w-32 text-left sm:inline">
            <span className="block truncate text-sm font-semibold text-slate-800">{profile?.name}</span>
            <span className="block text-[11px] font-medium text-emerald-800">{adminProfile.role}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        <div
          id="admin-profile-dropdown"
          className={`absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/10 ${open ? '' : 'hidden'}`}
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{profile?.name}</p>
            <p className="truncate text-xs text-slate-500">{profile?.email}</p>
            <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{adminProfile.role}</span>
          </div>
          <nav aria-label="Admin profile links" className="p-1.5">
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <LayoutDashboard className="h-4 w-4 text-emerald-800" aria-hidden="true" />
              Admin Panel
              <ExternalLink className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            {signOutError && <p role="alert" className="px-3 py-2 text-xs text-rose-700">{signOutError}</p>}
            <div aria-hidden="true" className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign Out
            </button>
          </nav>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-900 px-4 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="customer-profile-dropdown"
        aria-label={`Open profile menu for ${profile?.name}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-left transition-colors hover:border-emerald-600/40 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
      >
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
          {profile?.avatar ? (
            <Image src={profile.avatar} alt="" fill sizes="36px" className="object-cover" unoptimized />
          ) : (
            initials
          )}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-800 sm:inline">{profile?.name}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <div
        id="customer-profile-dropdown"
        className={`absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/10 ${open ? '' : 'hidden'}`}
      >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{profile?.name}</p>
            <p className="truncate text-xs text-slate-500">{profile?.email}</p>
            <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Valued Customer</span>
          </div>
          <nav aria-label="Profile links" className="p-1.5">
            {[
              { href: '/account', label: 'My Account', Icon: User },
              { href: '/account?tab=orders', label: 'My Orders', Icon: Package },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                <Icon className="h-4 w-4 text-emerald-800" aria-hidden="true" />
                {label}
              </Link>
            ))}
            <div aria-hidden="true" className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign Out
            </button>
          </nav>
      </div>
    </div>
  );
}
