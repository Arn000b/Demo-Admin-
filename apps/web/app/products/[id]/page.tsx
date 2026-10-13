import type { Metadata } from 'next';
import { StandaloneProductDetailsPage } from '@/components/storefront/StandaloneProductDetailsPage';

export const metadata: Metadata = {
  title: { absolute: 'Product Details | Anonna Mart' },
};

export default function ProductDetailsRoute() {
  return <StandaloneProductDetailsPage />;
}
