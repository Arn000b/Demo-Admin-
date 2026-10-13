import type { Metadata } from 'next';
import { OrderDetailsPage } from '@/components/customer-account/OrderDetailsPage';

export const metadata: Metadata = {
  title: { absolute: 'Order details | Anonna Mart' },
};

export default function OrderDetailsRoute() {
  return <OrderDetailsPage />;
}
