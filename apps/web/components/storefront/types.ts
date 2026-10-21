export interface StorefrontProduct {
  id: string;
  name: string;
  category: string;
  sku?: string;
  image?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  stock?: number;
  rating?: number;
  reviewsCount?: number;
  salesCount?: number;
  featured?: boolean;
  discountActive?: boolean;
  createdAt?: string;
  tags?: string[];
}

export interface StorefrontCategory {
  id: string;
  name: string;
  image?: string;
}

export interface StorefrontBanner {
  id: string;
  title: string;
  image?: string;
  position?: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
  variantId?: string;
  cartItemId?: string;
}

export function hasValidDiscount(product: StorefrontProduct): boolean {
  return Boolean(
    product.discountActive &&
    typeof product.originalPrice === 'number' &&
    product.originalPrice > product.price
  );
}

export function getDiscountPercent(product: StorefrontProduct): number {
  if (!hasValidDiscount(product) || !product.originalPrice) return 0;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

export function formatTaka(amount: number): string {
  return `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(amount)}`;
}
