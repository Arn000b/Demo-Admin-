'use client';

import { OrderHistory } from './OrderHistory';

export function AccountOrders() {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7" aria-labelledby="orders-heading">
      <p className="text-sm font-semibold text-emerald-800">Your activity</p>
      <h1 id="orders-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">My orders</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Review your purchases and keep track of every delivery.</p>
      <OrderHistory />
    </section>
  );
}
