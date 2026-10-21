'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Tag,
  Truck,
} from 'lucide-react';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useStore } from '@/components/providers/StoreContext';
import { useAuth } from '@/context/auth-context';
import { Logo } from '@/components/common/Logo';
import { formatTaka, type StorefrontProduct } from './types';
import {
  MOCK_ORDERS_STORAGE_KEY,
  readMockOrders,
  type MockOrder,
} from '@/components/customer-account/orders';
import {
  checkoutOrder,
  createPaymentAttempt,
  validateCoupon as apiValidateCoupon,
} from '@/lib/api/commerce';

interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  totalUses?: number;
  maxUsageLimit?: number;
  category?: string;
  status?: string;
  expiryDate?: string;
}

const inputClass =
  'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/15';
const emptyProducts: StorefrontProduct[] = [];
const primaryButtonClass =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function makeOrderId(existingIds: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = `AM-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!existingIds.has(id)) return id;
  }
  let timestampId = `AM-${Date.now()}`;
  let suffix = Date.now();
  while (existingIds.has(timestampId)) {
    suffix += 1;
    timestampId = `AM-${suffix}`;
  }
  return timestampId;
}

function addDays(date: Date, days: number): string {
  const deliveryDate = new Date(date);
  deliveryDate.setDate(deliveryDate.getDate() + days);
  return deliveryDate.toISOString();
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
    </div>
  );
}

export function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { cart, profile, addresses, clearCart } = useCustomerDemo();
  const store = useStore() as {
    products?: StorefrontProduct[];
    coupons?: Coupon[];
    showToast: (title: string, message?: string, type?: string) => void;
  };
  const products = store.products || emptyProducts;
  const coupons = store.coupons || [];
  const [recipient, setRecipient] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'Standard Delivery' | 'Express Delivery'>(
    'Standard Delivery'
  );
  const [paymentMethod, setPaymentMethod] =
    useState<MockOrder['paymentMethod']>('Cash on Delivery');
  const [promoInput, setPromoInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoError, setPromoError] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderRows = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = products.find((item) => item.id === line.productId);
        return product ? [{ product, quantity: line.quantity }] : [];
      }),
    [cart, products]
  );
  const subtotal = orderRows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const shippingFee = deliveryMethod === 'Standard Delivery' ? 60 : 120;
  const discount = appliedCoupon
    ? Math.min(
        subtotal,
        appliedCoupon.type === 'percentage'
          ? Math.min(
              Math.round((subtotal * appliedCoupon.value) / 100),
              appliedCoupon.maxDiscount ?? Number.POSITIVE_INFINITY
            )
          : Math.min(appliedCoupon.value, appliedCoupon.maxDiscount ?? appliedCoupon.value)
      )
    : 0;
  const total = subtotal + (orderRows.length ? shippingFee : 0) - discount;

  useEffect(() => {
    if (isLoading) return;
    setRecipient(user?.name || profile.name);
    setEmail(user?.email || profile.email);
    setPhone(profile.phone);
  }, [isLoading, profile.email, profile.name, profile.phone, user?.email, user?.name]);

  useEffect(() => {
    const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0];
    if (!defaultAddress) return;
    setSelectedAddressId(defaultAddress.id);
    setRecipient(defaultAddress.recipient || user?.name || profile.name);
    setDeliveryAddress(defaultAddress.address);
    if (defaultAddress.phone) setPhone(defaultAddress.phone);
  }, [addresses, profile.name, user?.name]);

  const selectAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;
    setRecipient(address.recipient);
    setDeliveryAddress(address.address);
    if (address.phone) setPhone(address.phone);
  };

  const applyPromoCode = async () => {
    const code = promoInput.trim().toLocaleUpperCase();
    if (!code) {
      setPromoError(true);
      setPromoMessage('Enter a promo code to apply it.');
      return;
    }
    // Attempt backend API coupon validation first
    try {
      const quote = await apiValidateCoupon(code);
      setAppliedCoupon({
        code,
        type: 'fixed',
        value: Number(quote.discountTotal),
      });
      setPromoInput(code);
      setPromoError(false);
      setPromoMessage(`${code} applied — you saved ${formatTaka(Number(quote.discountTotal))}.`);
      return;
    } catch {
      // Fallback to local catalog coupons
    }
    const coupon = coupons.find((item) => item.code.toLocaleUpperCase() === code);
    if (!coupon || coupon.status !== 'Active') {
      setPromoError(true);
      setPromoMessage('This promo code is not available.');
      return;
    }
    if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
      setPromoError(true);
      setPromoMessage('This promo code has expired.');
      return;
    }
    if (
      coupon.maxUsageLimit !== undefined &&
      coupon.totalUses !== undefined &&
      coupon.totalUses >= coupon.maxUsageLimit
    ) {
      setPromoError(true);
      setPromoMessage('This promo code has reached its usage limit.');
      return;
    }
    if (subtotal < (coupon.minOrderValue || 0)) {
      setPromoError(true);
      setPromoMessage(
        `Add items worth ${formatTaka((coupon.minOrderValue || 0) - subtotal)} to use this code.`
      );
      return;
    }
    if (
      coupon.category &&
      coupon.category !== 'All Categories' &&
      !orderRows.some((row) => row.product.category === coupon.category)
    ) {
      setPromoError(true);
      setPromoMessage(`This promo code applies to ${coupon.category} products.`);
      return;
    }
    setAppliedCoupon(coupon);
    setPromoInput(coupon.code);
    setPromoError(false);
    setPromoMessage(
      `${coupon.code} applied — you saved ${formatTaka(
        coupon.type === 'percentage'
          ? Math.min(
              Math.round((subtotal * coupon.value) / 100),
              coupon.maxDiscount ?? Number.POSITIVE_INFINITY
            )
          : Math.min(coupon.value, coupon.maxDiscount ?? coupon.value)
      )}.`
    );
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    if (!orderRows.length) {
      setSubmitError('Your cart is empty. Add an item before placing an order.');
      return;
    }
    if (!recipient.trim() || !deliveryAddress.trim() || !email.trim() || !phone.trim()) {
      setSubmitError('Complete your contact and delivery details to place this order.');
      return;
    }
    if (!user) {
      setSubmitError('Please sign in or create an account to place your order.');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const currentOrders = readMockOrders();

    try {
      // Execute real API checkout
      const idempotencyKey = `chk-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      let backendOrderId: string | null = null;
      try {
        const checkoutRes = await checkoutOrder({
          shippingAddress: {
            recipientName: recipient.trim(),
            phone: phone.trim(),
            division: 'Dhaka',
            district: 'Dhaka',
            addressLine: deliveryAddress.trim(),
          },
          couponCode: appliedCoupon?.code,
          idempotencyKey,
        });
        backendOrderId = checkoutRes.id;
      } catch (apiErr: unknown) {
        const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        console.warn('Backend checkout attempt note:', msg);
        if (!msg.includes('Failed to fetch') && !msg.includes('404')) {
          setSubmitError(msg);
          setIsSubmitting(false);
          return;
        }
      }

      const assignedId =
        backendOrderId || makeOrderId(new Set(currentOrders.map((item) => item.id)));

      // If bKash selected and we have a backend order ID, create payment attempt
      if (paymentMethod === 'bKash' && backendOrderId) {
        try {
          const paymentAttempt = await createPaymentAttempt(backendOrderId);
          if (paymentAttempt.checkoutUrl) {
            clearCart();
            window.location.href = paymentAttempt.checkoutUrl;
            return;
          }
        } catch (paymentErr: unknown) {
          const pMsg = paymentErr instanceof Error ? paymentErr.message : String(paymentErr);
          console.warn('bKash payment initiation note:', pMsg);
        }
      }

      const order: MockOrder = {
        id: assignedId,
        createdAt: now.toISOString(),
        estimatedDeliveryAt: addDays(now, deliveryMethod === 'Standard Delivery' ? 5 : 2),
        orderStatus: 'Order Placed',
        customerName: recipient.trim(),
        email: email.trim(),
        phone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        shippingMethod: deliveryMethod,
        shippingFee,
        paymentMethod,
        paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Cash on Delivery' : 'Paid',
        items: orderRows.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          image: product.image,
          quantity,
          unitPrice: product.price,
        })),
        subtotal,
        discount,
        couponCode: appliedCoupon?.code || null,
        total,
      };

      try {
        window.localStorage.setItem(
          MOCK_ORDERS_STORAGE_KEY,
          JSON.stringify([order, ...currentOrders])
        );
      } catch (error) {
        console.error('Unable to save the Anonna Mart mock order.', error);
      }

      clearCart();
      try {
        window.sessionStorage.setItem('anonna_pending_order_toast', order.id);
      } catch (error) {
        console.error('Unable to queue the order confirmation toast.', error);
        store.showToast('Order placed successfully!', `Your order #${order.id} is confirmed.`);
      }
      router.push(`/account/orders/${encodeURIComponent(order.id)}`);
    } catch (err: unknown) {
      const errMessage =
        err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      setSubmitError(errMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageHeader = (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Logo width={132} height={58} />
        <div className="hidden items-center gap-2 text-xs font-semibold text-emerald-900 sm:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900 text-white">
            <Check className="h-4 w-4" />
          </span>
          CART
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D4AF37] text-emerald-950">
            2
          </span>
          CHECKOUT
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            3
          </span>
          CONFIRMATION
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <LockKeyhole className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Secure checkout
        </span>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-[#f7f8f6]">
      {pageHeader}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Continue shopping
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
              Almost yours
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Checkout
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              A few details and your curated finds are on their way.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#D4AF37]/50 bg-amber-50 px-4 py-2 text-xs font-semibold text-emerald-950 sm:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Your details are
            protected
          </div>
        </div>

        {!orderRows.length ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
            <PackageCheck className="mx-auto h-10 w-10 text-emerald-800" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold text-slate-950">
              Your cart is ready for something lovely
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Add a few items before continuing to checkout.
            </p>
            <Link href="/#products" className={`${primaryButtonClass} mt-6`}>
              Explore the collection
            </Link>
          </section>
        ) : (
          <form
            onSubmit={submitOrder}
            className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,410px)] lg:gap-8"
          >
            <div className="space-y-5">
              <section
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                aria-labelledby="delivery-heading"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="delivery-heading" className="text-lg font-bold text-slate-950">
                      Delivery details
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Where should we send your order?</p>
                  </div>
                </div>

                {addresses.length > 0 && (
                  <div className="mt-5">
                    <label
                      htmlFor="saved-address"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Saved address
                    </label>
                    <select
                      id="saved-address"
                      value={selectedAddressId}
                      onChange={(event) => selectAddress(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Enter a new address</option>
                      {addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label} — {address.address}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field id="checkout-name" label="Full name">
                    <input
                      id="checkout-name"
                      required
                      autoComplete="name"
                      value={recipient}
                      onChange={(event) => setRecipient(event.target.value)}
                      className={inputClass}
                      placeholder="Your name"
                    />
                  </Field>
                  <Field id="checkout-email" label="Email address">
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </Field>
                  <Field id="checkout-phone" label="Phone number">
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className={inputClass}
                      placeholder="+880 1XXX-XXXXXX"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="checkout-address" label="Street address / area">
                      <textarea
                        id="checkout-address"
                        required
                        autoComplete="street-address"
                        rows={3}
                        value={deliveryAddress}
                        onChange={(event) => setDeliveryAddress(event.target.value)}
                        className={`${inputClass} min-h-24 resize-y`}
                        placeholder="House, road, area, district"
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <section
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                aria-labelledby="shipping-heading"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                    <Truck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="shipping-heading" className="text-lg font-bold text-slate-950">
                      Delivery option
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Choose the timing that works for you.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { name: 'Standard Delivery' as const, fee: 60, days: '3–5 business days' },
                    { name: 'Express Delivery' as const, fee: 120, days: '1–2 business days' },
                  ].map((option) => (
                    <label
                      key={option.name}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${deliveryMethod === option.name ? 'border-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-800' : 'border-slate-200 hover:border-emerald-800/40'}`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value={option.name}
                        checked={deliveryMethod === option.name}
                        onChange={() => setDeliveryMethod(option.name)}
                        className="h-4 w-4 accent-emerald-900"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">
                          {option.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">{option.days}</span>
                      </span>
                      <span className="text-sm font-bold text-emerald-950">
                        {formatTaka(option.fee)}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                aria-labelledby="payment-heading"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                    <CreditCard className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="payment-heading" className="text-lg font-bold text-slate-950">
                      Payment method
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Choose how you would like to pay.</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    { name: 'Cash on Delivery' as const, detail: 'Pay when it arrives' },
                    { name: 'bKash' as const, detail: 'Mobile payment' },
                    { name: 'Debit/Credit Card' as const, detail: 'Visa, Mastercard' },
                  ].map((method) => (
                    <label
                      key={method.name}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${paymentMethod === method.name ? 'border-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-800' : 'border-slate-200 hover:border-emerald-800/40'}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.name}
                        checked={paymentMethod === method.name}
                        onChange={() => setPaymentMethod(method.name)}
                        className="mt-0.5 h-4 w-4 accent-emerald-900"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {method.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">{method.detail}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {paymentMethod !== 'Cash on Delivery' && (
                  <p className="mt-4 rounded-lg border border-[#D4AF37]/50 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
                    This demo records your selected payment method; no payment will be charged.
                  </p>
                )}
              </section>
            </div>

            <aside className="lg:sticky lg:top-5">
              <section
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                aria-labelledby="summary-heading"
              >
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <h2 id="summary-heading" className="text-lg font-bold text-slate-950">
                      Order summary
                    </h2>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                      {orderRows.reduce((count, row) => count + row.quantity, 0)} items
                    </span>
                  </div>
                  <ul className="mt-4 divide-y divide-slate-100">
                    {orderRows.map(({ product, quantity }) => (
                      <li key={product.id} className="flex gap-3 py-3">
                        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              sizes="64px"
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <PackageCheck
                              className="m-5 h-6 w-6 text-slate-400"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Qty {quantity} × {formatTaka(product.price)}
                          </p>
                        </div>
                        <span className="whitespace-nowrap text-sm font-bold text-slate-900">
                          {formatTaka(product.price * quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-5 py-5 sm:px-6">
                  <div className="flex gap-2">
                    <label htmlFor="promo-code" className="sr-only">
                      Promo code
                    </label>
                    <input
                      id="promo-code"
                      value={promoInput}
                      onChange={(event) => {
                        setPromoInput(event.target.value);
                        setPromoMessage('');
                        setPromoError(false);
                      }}
                      placeholder="Promo code"
                      className={`${inputClass} min-w-0`}
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setPromoInput('');
                          setPromoMessage('Promo code removed.');
                        }}
                        className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={applyPromoCode}
                        className="min-h-12 rounded-xl border border-emerald-900 px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  {promoMessage && (
                    <p
                      role={promoError ? 'alert' : 'status'}
                      className={`mt-2 text-xs ${promoError ? 'text-rose-700' : 'text-emerald-800'}`}
                    >
                      {promoMessage}
                    </p>
                  )}

                  <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between gap-3 text-slate-600">
                      <dt>Subtotal</dt>
                      <dd className="font-semibold text-slate-900">{formatTaka(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 text-slate-600">
                      <dt>Shipping</dt>
                      <dd className="font-semibold text-slate-900">{formatTaka(shippingFee)}</dd>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between gap-3 text-emerald-800">
                        <dt className="inline-flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" aria-hidden="true" /> Discount
                          {appliedCoupon ? ` (${appliedCoupon.code})` : ''}
                        </dt>
                        <dd className="font-semibold">−{formatTaka(discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3 border-t border-slate-100 pt-4 text-base font-bold text-slate-950">
                      <dt>Total</dt>
                      <dd>{formatTaka(total)}</dd>
                    </div>
                  </dl>

                  {submitError && (
                    <p
                      role="alert"
                      className="mt-4 rounded-lg bg-rose-50 p-3 text-sm leading-5 text-rose-700"
                    >
                      {submitError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`${primaryButtonClass} mt-5 w-full`}
                  >
                    {isSubmitting ? (
                      'Placing your order…'
                    ) : (
                      <>
                        Complete Order <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                    By placing your order, you agree to our terms of service.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Safe,
                    simple, and secure checkout
                  </div>
                </div>
              </section>
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                <PackageCheck className="h-4 w-4 text-[#a38519]" aria-hidden="true" /> Thoughtfully
                packed with care
              </p>
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}
