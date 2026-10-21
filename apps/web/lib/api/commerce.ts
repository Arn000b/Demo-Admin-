import type { Cart, Coupon, Order, PaginatedResponse, Payment, Wishlist } from '@repo/type';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface ShippingAddressInput {
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  addressLine: string;
}

export interface CheckoutInput {
  shippingAddress: ShippingAddressInput;
  couponCode?: string;
  idempotencyKey: string;
}

export interface CheckoutResponseData {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal?: string;
  reservationExpiresAt?: string;
  replayed: boolean;
}

export interface CouponValidationResult {
  currency: string;
  itemsTotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
}

export interface PaymentAttemptResponse {
  id: string;
  amount: string;
  status: string;
  checkoutUrl?: string;
}

export interface CartResponseItem {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  currentPrice: string | null;
}

export interface CartResponse {
  id: string;
  items: CartResponseItem[];
}

// ─── Cart APIs ──────────────────────────────────────────────────────────────

export async function fetchCart(): Promise<CartResponse | null> {
  const response = await fetch(`${API_BASE}/cart`, {
    method: 'GET',
    credentials: 'include',
  });
  if (response.status === 401 || response.status === 403) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to fetch cart (${response.status})`);
  }
  return body.data;
}

export async function addCartItem(variantId: string, quantity: number): Promise<unknown> {
  const response = await fetch(`${API_BASE}/cart/items`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variantId, quantity }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to add cart item (${response.status})`);
  }
  return body.data;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<unknown> {
  const response = await fetch(`${API_BASE}/cart/items/${itemId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to update cart item (${response.status})`);
  }
  return body.data;
}

export async function removeCartItem(itemId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/cart/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);
  return Boolean(response.ok && body?.success);
}

// ─── Wishlist APIs ──────────────────────────────────────────────────────────

export async function fetchWishlists(): Promise<Wishlist[]> {
  const response = await fetch(`${API_BASE}/wishlists`, {
    method: 'GET',
    credentials: 'include',
  });
  if (response.status === 401 || response.status === 403) return [];
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) return [];
  return body.data ?? [];
}

export async function addWishlistItem(
  wishlistId: string,
  target: { productId?: string; variantId?: string }
): Promise<unknown> {
  const response = await fetch(`${API_BASE}/wishlists/${wishlistId}/items`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(target),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? 'Failed to add item to wishlist');
  }
  return body.data;
}

export async function removeWishlistItem(wishlistId: string, itemId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/wishlists/${wishlistId}/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);
  return Boolean(response.ok && body?.success);
}

// ─── Coupon Validation ──────────────────────────────────────────────────────

export async function validateCoupon(code: string): Promise<CouponValidationResult> {
  const response = await fetch(`${API_BASE}/coupons/validate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? 'Coupon is invalid or not applicable');
  }
  return body.data;
}

// ─── Checkout & Orders ──────────────────────────────────────────────────────

export async function checkoutOrder(input: CheckoutInput): Promise<CheckoutResponseData> {
  const response = await fetch(`${API_BASE}/orders/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Checkout failed (${response.status})`);
  }
  return body.data;
}

export async function fetchCustomerOrders(
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResponse<Order>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const url = `${API_BASE}/orders${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });
  if (response.status === 401 || response.status === 403) {
    return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to fetch orders (${response.status})`);
  }
  return {
    data: body.data ?? [],
    meta: body.meta ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  };
}

export async function fetchCustomerOrder(orderId: string): Promise<Order | null> {
  const response = await fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (response.status === 404 || response.status === 401 || response.status === 403) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to fetch order ${orderId}`);
  }
  return body.data ?? null;
}

export async function cancelCustomerOrder(orderId: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
    method: 'POST',
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to cancel order ${orderId}`);
  }
  return body.data;
}

// ─── Payment APIs ───────────────────────────────────────────────────────────

export async function createPaymentAttempt(orderId: string): Promise<PaymentAttemptResponse> {
  const response = await fetch(`${API_BASE}/payments/orders/${orderId}/payments`, {
    method: 'POST',
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to create payment attempt (${response.status})`);
  }
  return body.data;
}
