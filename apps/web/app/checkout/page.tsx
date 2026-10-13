import type { Metadata } from 'next';
import { CheckoutPage } from '@/components/storefront/CheckoutPage';

export const metadata: Metadata = {
  title: { absolute: 'Checkout | Anonna Mart' },
  description: 'Complete your Anonna Mart order securely.',
};

export default function CheckoutRoute() {
  return <CheckoutPage />;
}
