import type { Metadata } from 'next';
import { AccountAddresses } from '@/components/customer-account/AccountAddresses';

export const metadata: Metadata = { title: { absolute: 'Saved addresses | Anonna Mart' } };

export default function AccountAddressesPage() {
  return <AccountAddresses />;
}
