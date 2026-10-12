'use client';

import Link from 'next/link';
import { PackageOpen, ArrowRight } from 'lucide-react';

export function AccountOrders() {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7" aria-labelledby="orders-heading">
      <p className="text-sm font-semibold text-emerald-800">Your activity</p>
      <h1 id="orders-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">My orders</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Review your purchases and keep track of every delivery.</p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
        <PackageOpen className="mx-auto h-9 w-9 text-emerald-800" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">You have no recent orders</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">When you place an order, its details and delivery updates will appear here.</p>
        <Link href="/#products" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
          Start Shopping <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
