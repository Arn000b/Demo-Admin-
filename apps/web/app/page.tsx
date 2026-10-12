import type { Metadata } from 'next';
import { StorefrontHome } from '@/components/storefront/StorefrontHome';

export const metadata: Metadata = {
  title: 'Anonna Mart | Curated Finds for Everyday Living',
  description: 'Shop thoughtfully curated home, fashion, and pantry essentials at Anonna Mart.',
};

export default function HomePage() {
  return <StorefrontHome />;
}
