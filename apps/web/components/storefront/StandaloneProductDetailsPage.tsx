'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  Home,
  PackageCheck,
  ShoppingBag,
  Star,
  X,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useStore } from '@/components/providers/StoreContext';
import { ProductThumbnail } from './ProductCard';
import { CartDrawer } from './StorefrontPanels';
import {
  formatTaka,
  getDiscountPercent,
  hasValidDiscount,
  type StorefrontProduct,
} from './types';

const emptyProducts: StorefrontProduct[] = [];

export function StandaloneProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const {
    cart,
    wishlistIds,
    addToCart,
    setCartQuantity,
    removeFromCart,
    toggleWishlist,
  } = useCustomerDemo();
  const store = useStore() as {
    products?: StorefrontProduct[];
    showToast: (title: string, message?: string, type?: string) => void;
  };
  const products = store.products || emptyProducts;
  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [productId, products],
  );
  const wished = Boolean(product && wishlistIds.includes(product.id));
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartSubtotal = cart.reduce((sum, line) => {
    const item = products.find((candidate) => candidate.id === line.productId);
    return sum + (item?.price || 0) * line.quantity;
  }, 0);

  const handleAddToCart = (item: StorefrontProduct) => {
    if (!item.stock || item.stock < 1) {
      store.showToast('Out of stock', `${item.name} is currently unavailable.`, 'warning');
      return;
    }
    if (!addToCart(item)) {
      store.showToast('Stock limit reached', `Only ${item.stock} of ${item.name} are available.`, 'warning');
      return;
    }
    store.showToast('Added to cart', `${item.name} is in your cart.`);
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F6F7F4]">
        <header className="border-b border-slate-200 bg-white px-4 py-2"><div className="mx-auto max-w-7xl"><Logo width={154} height={68} className="!w-[128px] bg-transparent [&_img]:mix-blend-multiply" /></div></header>
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-emerald-800" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">We couldn’t find this product</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">It may have been removed or the product link may be incorrect.</p>
          <Link href="/products" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Browse all products
          </Link>
        </main>
      </div>
    );
  }

  const soldOut = !product.stock || product.stock < 1;
  const hasDiscount = hasValidDiscount(product);
  const galleryImages = product.image ? [product.image] : [];

  return (
    <div className="min-h-screen bg-[#F6F7F4] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo width={154} height={68} className="!w-[128px] bg-transparent sm:!w-[154px] [&_img]:mix-blend-multiply" />
          <nav className="hidden items-center gap-2 text-sm text-slate-500 sm:flex" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-emerald-900">Home</Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <Link href="/products" className="hover:text-emerald-900">Products</Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="max-w-48 truncate font-medium text-slate-800">{product.name}</span>
          </nav>
          <button type="button" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${cartCount} items, subtotal ${formatTaka(cartSubtotal)}`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-900">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-emerald-900 px-1 text-center text-[10px] font-bold leading-4 text-white">{cartCount}</span>}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <Link href="/products" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to all products
        </Link>

        <article className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid md:grid-cols-2">
            <div className="bg-slate-100 p-4 sm:p-6">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
                {galleryImages.length ? (
                  <Image
                    src={galleryImages[activeImage]}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <ProductThumbnail product={product} className="h-full w-full object-cover" />
                )}
                {hasDiscount && <span className="absolute left-4 top-4 rounded-md bg-[#D4AF37] px-3 py-1.5 text-sm font-bold text-emerald-950">{getDiscountPercent(product)}% off</span>}
              </div>
              {galleryImages.length > 0 && (
                <div className="mt-3 flex gap-3" aria-label="Product image gallery">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      aria-label={`View product image ${index + 1}`}
                      aria-pressed={activeImage === index}
                      className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 bg-white transition ${activeImage === index ? 'border-emerald-800' : 'border-transparent hover:border-slate-300'}`}
                    >
                      <Image src={image} alt="" fill sizes="64px" unoptimized className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">{product.category}</Link>
                {product.featured && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">Featured pick</span>}
              </div>
              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">{product.name}</h1>
              {typeof product.rating === 'number' && (
                <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-600" aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}>
                  <Star className="h-4 w-4 fill-[#D4AF37] text-[#a38519]" aria-hidden="true" />
                  <span className="font-semibold text-slate-900">{product.rating.toFixed(1)}</span>
                  {product.reviewsCount ? <span>({product.reviewsCount} reviews)</span> : null}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <p className="text-3xl font-bold text-emerald-950">{formatTaka(product.price)}</p>
                {hasDiscount && product.originalPrice !== undefined && (
                  <>
                    <p className="text-lg text-slate-400 line-through">{formatTaka(product.originalPrice)}</p>
                    <span className="text-sm font-semibold text-emerald-800">Save {formatTaka(product.originalPrice - product.price)}</span>
                  </>
                )}
              </div>

              <p className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${soldOut ? 'text-rose-700' : 'text-emerald-800'}`}>
                {soldOut ? <X className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                {soldOut ? 'Currently out of stock' : `In stock${product.stock !== undefined ? ` · ${product.stock} available` : ''}`}
              </p>

              {product.description && <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">{product.description}</p>}
              {product.sku && <p className="mt-4 text-xs font-medium text-slate-500">SKU: {product.sku}</p>}
              {product.tags?.length ? (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Product tags">
                  {product.tags.map((tag) => <li key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{tag}</li>)}
                </ul>
              ) : null}

              <div className="mt-auto grid grid-cols-[minmax(0,1fr)_48px] gap-3 pt-8">
                <button type="button" onClick={() => handleAddToCart(product)} disabled={soldOut} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Add to cart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleWishlist(product.id);
                    store.showToast(
                      wished ? 'Removed from wishlist' : 'Added to wishlist',
                      wished ? 'The item has been removed from your saved products.' : 'The item has been saved to your wishlist.',
                      'info',
                    );
                  }}
                  aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-pressed={wished}
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${wished ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:border-emerald-800 hover:text-emerald-900'}`}
                >
                  <Heart className={`h-5 w-5 ${wished ? 'fill-current' : ''}`} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <PackageCheck className="h-4 w-4 shrink-0 text-emerald-800" aria-hidden="true" /> Carefully packed and delivered across Bangladesh
              </div>
            </div>
          </div>
        </article>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Continue browsing">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-950">Still exploring?</h2>
              <p className="mt-1 text-sm text-slate-600">Browse more carefully selected Anonna Mart finds.</p>
            </div>
            <Link href="/products" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-900 px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50">
              <Home className="h-4 w-4" aria-hidden="true" /> All products <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {cartOpen && (
        <CartDrawer
          products={products}
          cart={cart}
          onClose={() => setCartOpen(false)}
          onViewProduct={(item) => {
            setCartOpen(false);
            router.push(`/products/${encodeURIComponent(item.id)}`);
          }}
          onSetQuantity={setCartQuantity}
          onRemove={removeFromCart}
        />
      )}
    </div>
  );
}
