import type { Category, PaginatedResponse, Product, Variant } from '@repo/type';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface ProductQueryParams {
  categoryId?: string;
  vendorId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CategoryQueryParams {
  page?: number;
  pageSize?: number;
}

export async function fetchProducts(
  params: ProductQueryParams = {}
): Promise<PaginatedResponse<Product>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.vendorId) query.set('vendorId', params.vendorId);
  if (params.q) query.set('q', params.q);

  const url = `${API_BASE}/products${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, { credentials: 'include' });
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to fetch products (${response.status})`);
  }

  return {
    data: body.data ?? [],
    meta: body.meta ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  };
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const response = await fetch(`${API_BASE}/products/${id}`, { credentials: 'include' });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to fetch product ${id}`);
  }

  return body.data ?? null;
}

export async function fetchProductVariants(productId: string): Promise<Variant[]> {
  const response = await fetch(`${API_BASE}/products/${productId}/variants`, {
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to fetch variants for product ${productId}`);
  }

  return body.data ?? [];
}

export async function fetchCategories(
  params: CategoryQueryParams = {}
): Promise<PaginatedResponse<Category>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const url = `${API_BASE}/categories${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, { credentials: 'include' });
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to fetch categories (${response.status})`);
  }

  return {
    data: body.data ?? [],
    meta: body.meta ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  };
}

export async function fetchCategory(id: string): Promise<Category | null> {
  const response = await fetch(`${API_BASE}/categories/${id}`, { credentials: 'include' });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Failed to fetch category ${id}`);
  }

  return body.data ?? null;
}
