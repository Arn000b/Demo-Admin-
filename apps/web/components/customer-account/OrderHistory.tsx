'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, PackageOpen } from 'lucide-react';
import { formatTaka } from '@/components/storefront/types';
import { readMockOrders, type MockOrder } from './orders';

function statusClasses(status: string) {
  if (status === 'Delivered') return 'bg-emerald-50 text-emerald-800';
  if (status === 'Cancelled') return 'bg-rose-50 text-rose-700';
  if (status === 'Shipped' || status === 'Out for Delivery') return 'bg-amber-50 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function OrderCard({ order }: { order: MockOrder }) {
  return (
    <article className="rounded-xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-bold text-slate-950">#{order.id}</p>
          <p className="mt-1 text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleDateString('en-BD', { dateStyle: 'medium' })}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(order.orderStatus)}`}>
          {order.orderStatus}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {order.items.slice(0, 3).map((item) => (
              <span key={item.productId} className="relative h-10 w-10 overflow-hidden rounded-lg border-2 border-white bg-slate-100">
                {item.image ? (
                  <Image src={item.image} alt="" fill sizes="40px" unoptimized className="object-cover" />
                ) : (
                  <PackageOpen className="m-2 h-5 w-5 text-slate-400" aria-hidden="true" />
                )}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            {order.items.length} {order.items.length === 1 ? 'item' : 'items'} · {formatTaka(order.total)}
          </p>
        </div>
        <Link
          href={`/account/orders/${encodeURIComponent(order.id)}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-900 px-4 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          Track Order <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function OrderHistory({ compact = false }: { compact?: boolean }) {
  const [orders, setOrders] = useState<MockOrder[]>([]);

  useEffect(() => {
    setOrders(readMockOrders().sort((first, second) => (
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    )));
  }, []);

  if (!orders.length) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
        <PackageOpen className="mx-auto h-8 w-8 text-emerald-800" aria-hidden="true" />
        <h2 className="mt-3 font-semibold text-slate-900">You have no recent orders</h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">
          When you place an order, its details and delivery updates will appear here.
        </p>
        <Link
          href="/#products"
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          Start Shopping <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const visibleOrders = compact ? orders.slice(0, 2) : orders;
  return (
    <div className="mt-5 space-y-3">
      {visibleOrders.map((order) => <OrderCard key={order.id} order={order} />)}
      {compact && orders.length > visibleOrders.length && (
        <Link href="/account/orders" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-900 hover:text-emerald-700">
          View all orders <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
