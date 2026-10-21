'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import { formatTaka } from '@/components/storefront/types';
import { useStore } from '@/components/providers/StoreContext';
import { isMockOrder, ORDER_STATUSES, readMockOrders, type MockOrder } from './orders';
import { fetchCustomerOrder } from '@/lib/api/commerce';
import { useAuth } from '@/context/auth-context';

const statusIcons = [Package, CheckCircle2, Truck, Truck, Check] as const;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { user } = useAuth();
  const store = useStore() as {
    showToast: (title: string, message?: string, type?: string) => void;
  };
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDetail() {
      if (orderId && user) {
        try {
          const remote = await fetchCustomerOrder(orderId);
          if (remote && isMounted) {
            const statusMap: Record<string, MockOrder['orderStatus']> = {
              pending: 'Order Placed',
              processing: 'Processing',
              shipped: 'Shipped',
              delivered: 'Delivered',
              cancelled: 'Cancelled',
            };
            const mappedOrder: MockOrder = {
              id: remote.orderNumber || remote.id,
              createdAt: remote.orderDate || remote.createdAt,
              estimatedDeliveryAt: new Date(
                new Date(remote.orderDate || remote.createdAt).getTime() + 4 * 86400000
              ).toISOString(),
              orderStatus: statusMap[remote.status] || 'Order Placed',
              customerName:
                (remote as unknown as { address?: { recipientName?: string } }).address
                  ?.recipientName ||
                user.name ||
                'Valued Customer',
              email: user.email || '',
              phone:
                (remote as unknown as { address?: { phone?: string } }).address?.phone ||
                user.phone ||
                '',
              deliveryAddress:
                (remote as unknown as { address?: { addressLine?: string } }).address
                  ?.addressLine || 'Home Delivery',
              shippingMethod: 'Standard Delivery',
              shippingFee: Number(remote.shippingFee || 0),
              paymentMethod: 'bKash',
              paymentStatus:
                remote.status === 'delivered' ||
                remote.status === 'shipped' ||
                remote.status === 'processing'
                  ? 'Paid'
                  : 'Cash on Delivery',
              items: (
                (
                  remote as unknown as {
                    items?: {
                      variantId?: string;
                      id: string;
                      name: string;
                      quantity: number;
                      purchasedPrice: string;
                    }[];
                  }
                ).items || []
              ).map((it) => ({
                productId: it.variantId || it.id,
                name: it.name || 'Artisan Product',
                quantity: it.quantity,
                unitPrice: Number(it.purchasedPrice || 0),
              })),
              subtotal: Number(remote.itemsTotal || remote.grandTotal),
              discount: Number(remote.discountTotal || 0),
              couponCode: null,
              total: Number(remote.grandTotal),
            };
            setOrder(mappedOrder);
            setLoaded(true);
            return;
          }
        } catch {
          // Fallback to local
        }
      }
      if (!isMounted) return;
      const savedOrder: unknown = readMockOrders().find((item) => item.id === orderId);
      setOrder(isMockOrder(savedOrder) ? savedOrder : null);
      setLoaded(true);
    }
    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [orderId, user]);

  useEffect(() => {
    if (!order || !loaded) return;
    try {
      if (window.sessionStorage.getItem('anonna_pending_order_toast') !== order.id) return;
      window.sessionStorage.removeItem('anonna_pending_order_toast');
      store.showToast('Order placed successfully!', `Your order #${order.id} is confirmed.`);
    } catch (error) {
      console.error('Unable to display the queued order confirmation toast.', error);
    }
  }, [loaded, order, store]);

  if (!loaded) {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
        role="status"
      >
        Loading your order…
      </div>
    );
  }

  if (!order) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center">
        <Package className="mx-auto h-9 w-9 text-emerald-800" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-slate-950">We couldn’t find that order</h1>
        <p className="mt-2 text-sm text-slate-600">
          It may have been removed from this browser, or the order ID may be incorrect.
        </p>
        <Link
          href="/account/orders"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-900 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to my orders
        </Link>
      </section>
    );
  }

  const cancelled = order.orderStatus === 'Cancelled';
  const statusIndex = cancelled
    ? -1
    : ORDER_STATUSES.findIndex((status) => status === order.orderStatus);

  return (
    <div className="space-y-5">
      <Link
        href="/account/orders"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My orders
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-7">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Order details</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Order #{order.id}
            </h1>
            <p className="mt-2 text-sm text-slate-600">Placed {formatDate(order.createdAt)}</p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${cancelled ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-900'}`}
          >
            {order.orderStatus}
          </span>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-950">Delivery progress</h2>
              <p className="mt-1 text-sm text-slate-500">
                {cancelled ? (
                  'This order has been cancelled.'
                ) : (
                  <>
                    Estimated delivery{' '}
                    <span className="font-semibold text-slate-800">
                      {formatDate(order.estimatedDeliveryAt)}
                    </span>
                  </>
                )}
              </p>
            </div>
            {!cancelled && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Updates as your order moves
              </span>
            )}
          </div>

          {cancelled ? (
            <p className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
              Contact our support team if you need help with this order.
            </p>
          ) : (
            <ol className="mt-7 grid grid-cols-5 gap-1" aria-label="Order status">
              {ORDER_STATUSES.map((status, index) => {
                const Icon = statusIcons[index];
                const complete = index <= statusIndex;
                const current = index === statusIndex;
                return (
                  <li key={status} className="relative min-w-0 text-center">
                    {index > 0 && (
                      <span
                        className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${index <= statusIndex ? 'bg-emerald-800' : 'bg-slate-200'}`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white ${current ? 'bg-[#D4AF37] text-emerald-950' : complete ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {complete ? (
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={`mx-auto mt-2 block max-w-20 text-[10px] leading-4 sm:max-w-none sm:text-xs ${current ? 'font-bold text-emerald-950' : complete ? 'font-medium text-slate-700' : 'text-slate-400'}`}
                    >
                      {status}
                    </span>
                    {current && <span className="sr-only">Current status</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          aria-labelledby="items-heading"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="items-heading" className="text-lg font-bold text-slate-950">
              Items in this order
            </h2>
            <span className="text-sm text-slate-500">
              {order.items.reduce((count, item) => count + item.quantity, 0)} items
            </span>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.productId} className="flex gap-4 py-4">
                <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="80px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <Package className="m-7 h-6 w-6 text-slate-400" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1 self-center">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Qty {item.quantity} · {formatTaka(item.unitPrice)} each
                  </p>
                </div>
                <p className="self-center whitespace-nowrap text-sm font-bold text-slate-900">
                  {formatTaka(item.unitPrice * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-5">
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            aria-labelledby="address-heading"
          >
            <h2 id="address-heading" className="flex items-center gap-2 font-bold text-slate-950">
              <MapPin className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Delivery address
            </h2>
            <p className="mt-4 text-sm font-semibold text-slate-900">{order.customerName}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
              {order.deliveryAddress}
            </p>
            <p className="mt-2 text-sm text-slate-600">{order.phone}</p>
            <p className="mt-1 break-all text-sm text-slate-600">{order.email}</p>
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
              {order.shippingMethod}
            </p>
          </section>

          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            aria-labelledby="payment-summary-heading"
          >
            <h2
              id="payment-summary-heading"
              className="flex items-center gap-2 font-bold text-slate-950"
            >
              <CreditCard className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Payment summary
            </h2>
            <div className="mt-4 flex items-start justify-between gap-3 text-sm">
              <span className="text-slate-600">{order.paymentMethod}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between gap-3 text-slate-600">
                <dt>Subtotal</dt>
                <dd className="font-medium text-slate-900">{formatTaka(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-slate-600">
                <dt>Shipping</dt>
                <dd className="font-medium text-slate-900">{formatTaka(order.shippingFee)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between gap-3 text-emerald-800">
                  <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                  <dd className="font-medium">−{formatTaka(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-3 font-bold text-slate-950">
                <dt>Total</dt>
                <dd>{formatTaka(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
