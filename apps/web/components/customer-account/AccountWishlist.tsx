'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ProductDetails } from '@/components/storefront/StorefrontPanels';
import type { StorefrontProduct } from '@/components/storefront/types';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useStore } from '@/components/providers/StoreContext';

export function AccountWishlist() {
  const store = useStore() as { products?: StorefrontProduct[] };
  const { wishlistIds, removeFromWishlist, addToCart } = useCustomerDemo();
  const products = useMemo(
    () => (store.products || []).filter((product) => wishlistIds.includes(product.id)),
    [store.products, wishlistIds],
  );
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const addProductToCart = (product: StorefrontProduct) => {
    if (!product.stock || product.stock < 1) {
      setAnnouncement(`${product.name} is currently unavailable.`);
      return;
    }
    setAnnouncement(
      addToCart(product)
        ? `${product.name} added to your cart.`
        : `Only ${product.stock} of ${product.name} are currently available.`,
    );
  };

  return (
    <section aria-labelledby="wishlist-heading">
      <p className="text-sm font-semibold text-emerald-800">Saved for later</p>
      <h1 id="wishlist-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">My wishlist</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Keep the things you love close at hand.</p>

      {products.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              wished
              onView={setSelectedProduct}
              onToggleWishlist={removeFromWishlist}
              onAddToCart={addProductToCart}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <Heart className="mx-auto h-9 w-9 text-emerald-800" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Your wishlist is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Explore the collection and save your favourite finds for later.</p>
          <Link href="/#products" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
            Start Shopping <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          wished={wishlistIds.includes(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onToggleWishlist={removeFromWishlist}
          onAddToCart={addProductToCart}
        />
      )}
    </section>
  );
}
