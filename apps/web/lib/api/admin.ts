import type { Coupon, ApiResponse, PaginatedResponse } from '@repo/type';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error || `Admin API Error ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

export interface AdminAnalyticsData {
  customers: number;
  vendors: number;
  products: number;
  orders: number;
  totalRevenue: string;
  averageOrderValue: string;
  ordersByStatus: Array<{ status: string; count: number }>;
}

export interface AdminCouponInput {
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: string;
  minOrderAmount?: string;
  expiryDate?: string | null;
  usageLimit?: number | null;
  isActive?: boolean;
}

export interface AdminStoreSettingsData {
  storeName: string;
  tagline: string;
  currency: string;
  currencySymbol: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  vatPercent: number;
  defaultDeliveryFeeDhaka: number;
  defaultDeliveryFeeOutside: number;
  freeShippingThreshold: number;
  bkash: boolean;
  nagad: boolean;
  sslcommerz: boolean;
  cod: boolean;
}

export async function fetchAdminOverview(): Promise<
  ApiResponse<{
    customers: number;
    vendors: number;
    products: number;
    ordersByStatus: Array<{ status: string; count: number }>;
  }>
> {
  return adminRequest('/admin/overview');
}

export async function fetchAdminAnalytics(): Promise<ApiResponse<AdminAnalyticsData>> {
  return adminRequest('/admin/analytics');
}

export async function fetchAdminCoupons(
  page = 1,
  pageSize = 20,
  q?: string,
  isActive?: boolean
): Promise<PaginatedResponse<Coupon>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set('q', q);
  if (isActive !== undefined) params.set('isActive', String(isActive));
  return adminRequest(`/admin/coupons?${params.toString()}`);
}

export async function createAdminCoupon(input: AdminCouponInput): Promise<ApiResponse<Coupon>> {
  return adminRequest('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminCoupon(
  id: string,
  input: Partial<AdminCouponInput>
): Promise<ApiResponse<Coupon>> {
  return adminRequest(`/admin/coupons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteAdminCoupon(id: string): Promise<ApiResponse<{ id: string }>> {
  return adminRequest(`/admin/coupons/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminSettings(): Promise<ApiResponse<AdminStoreSettingsData>> {
  return adminRequest('/admin/settings');
}

export async function updateAdminSettings(
  settings: Partial<AdminStoreSettingsData>
): Promise<ApiResponse<AdminStoreSettingsData>> {
  return adminRequest('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function fetchFeaturedProductIds(): Promise<ApiResponse<string[]>> {
  return adminRequest('/admin/featured-products');
}

export async function updateFeaturedProductIds(
  productIds: string[]
): Promise<ApiResponse<string[]>> {
  return adminRequest('/admin/featured-products', {
    method: 'PUT',
    body: JSON.stringify({ productIds }),
  });
}
