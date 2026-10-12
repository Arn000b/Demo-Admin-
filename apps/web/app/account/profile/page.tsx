import type { Metadata } from 'next';
import { AccountProfile } from '@/components/customer-account/AccountProfile';

export const metadata: Metadata = { title: { absolute: 'My profile | Anonna Mart' } };

export default function AccountProfilePage() {
  return <AccountProfile />;
}
