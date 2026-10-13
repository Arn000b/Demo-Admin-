import type { Metadata } from 'next';
import { ProductListingPage } from '@/components/storefront/ProductListingPage';

export const metadata: Metadata = {
  title: { absolute: 'Shop All Products | Anonna Mart' },
  description: 'Browse Anonna Mart’s curated collection by category.',
};

export default function ProductsPage() {
  return <ProductListingPage />;
}
