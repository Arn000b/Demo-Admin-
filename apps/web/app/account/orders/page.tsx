import type { Metadata } from 'next';
import { AccountOrders } from '@/components/customer-account/AccountOrders';

export const metadata: Metadata = { title: { absolute: 'My orders | Anonna Mart' } };

export default function AccountOrdersPage() {
  return <AccountOrders />;
}
