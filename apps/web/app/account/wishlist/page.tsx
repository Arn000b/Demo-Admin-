import type { Metadata } from 'next';
import { AccountWishlist } from '@/components/customer-account/AccountWishlist';

export const metadata: Metadata = { title: { absolute: 'My wishlist | Anonna Mart' } };

export default function AccountWishlistPage() {
  return <AccountWishlist />;
}
