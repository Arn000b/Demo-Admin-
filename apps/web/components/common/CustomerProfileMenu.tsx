'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Package, User } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';

export function CustomerProfileMenu() {
  const { user, isLoading, logout } = useAuth();
  const { signOut: clearCustomerState } = useCustomerDemo();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = user?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase();

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

  const handleSignOut = () => {
    logout();
    clearCustomerState();
    setOpen(false);
    router.replace('/');
  };

  if (isLoading) {
    return <span className="inline-flex h-10 w-[88px] animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />;
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
        aria-label={`Open profile menu for ${user.name}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-left transition-colors hover:border-emerald-600/40 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
      >
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
          {user.avatar ? (
            <Image src={user.avatar} alt="" fill sizes="36px" className="object-cover" unoptimized />
          ) : (
            initials
          )}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-800 sm:inline">{user.name}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <div
        id="customer-profile-dropdown"
        className={`absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/10 ${open ? '' : 'hidden'}`}
      >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
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
