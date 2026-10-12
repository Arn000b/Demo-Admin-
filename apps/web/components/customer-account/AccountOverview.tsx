'use client';

import Link from 'next/link';
import { ArrowRight, Heart, MapPin, Package, ShoppingBag, UserRound } from 'lucide-react';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useAuth } from '@/context/auth-context';

const panelClass = 'rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:border-emerald-600/40 hover:shadow-md sm:p-6';

export function AccountOverview() {
  const { profile, addresses, wishlistIds } = useCustomerDemo();
  const { user } = useAuth();

  return (
    <div>
      <p className="text-sm font-semibold text-emerald-800">Customer account</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Welcome back, {user?.name || profile.name.trim() || 'Customer'}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Manage your orders, delivery details, wishlist, and profile.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/account/orders" className={`${panelClass} group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700`}>
          <Package className="h-5 w-5 text-emerald-800" aria-hidden="true" />
          <p className="mt-4 text-sm text-slate-500">Recent orders</p>
          <p className="mt-1 font-semibold text-slate-900">You have no recent orders</p>
          <p className="mt-2 text-sm text-slate-600">Your order history will appear here.</p>
        </Link>
        <Link href="/account/addresses" className={`${panelClass} group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700`}>
          <MapPin className="h-5 w-5 text-emerald-800" aria-hidden="true" />
          <p className="mt-4 text-sm text-slate-500">Saved addresses</p>
          <p className="mt-1 font-semibold text-slate-900">{addresses.length} {addresses.length === 1 ? 'address' : 'addresses'}</p>
          <p className="mt-2 text-sm text-slate-600">{addresses.length ? 'Manage your delivery details.' : 'Add an address for faster checkout.'}</p>
        </Link>
        <Link href="/account/wishlist" className={`${panelClass} group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700`}>
          <Heart className="h-5 w-5 text-emerald-800" aria-hidden="true" />
          <p className="mt-4 text-sm text-slate-500">Wishlist</p>
          <p className="mt-1 font-semibold text-slate-900">{wishlistIds.length} saved {wishlistIds.length === 1 ? 'item' : 'items'}</p>
          <p className="mt-2 text-sm text-slate-600">{wishlistIds.length ? 'View your saved favourites.' : 'Save favourites to find them easily.'}</p>
        </Link>
        <Link href="/account/profile" className={`${panelClass} group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <UserRound className="h-5 w-5 text-emerald-800" aria-hidden="true" />
              <p className="mt-4 text-sm text-slate-500">Profile details</p>
              <p className="mt-1 font-semibold text-slate-900">{user?.name || profile.name || 'Complete your profile'}</p>
              <p className="mt-1 text-sm text-slate-600">{user?.email || profile.email || 'No email provided'}</p>
            </div>
            <ArrowRight className="mt-1 h-5 w-5 text-slate-400 transition group-hover:text-emerald-800" aria-hidden="true" />
          </div>
        </Link>
      </div>

      <section className={`${panelClass} mt-6`} aria-labelledby="recent-orders-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShoppingBag className="mt-0.5 h-5 w-5 text-emerald-800" aria-hidden="true" />
            <div>
              <h2 id="recent-orders-heading" className="text-lg font-bold text-slate-950">Recent orders</h2>
              <p className="mt-1 text-sm text-slate-600">You have no recent orders. Ready to find something you love?</p>
            </div>
          </div>
          <Link href="/#products" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
            Start Shopping <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
