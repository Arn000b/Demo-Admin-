import type { Metadata } from 'next';
import { AccountOverview } from '@/components/customer-account/AccountOverview';

export const metadata: Metadata = { title: { absolute: 'Account overview | Anonna Mart' } };

export default function AccountPage() {
  return <AccountOverview />;
}
