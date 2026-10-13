'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Heart, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useStore } from '@/components/providers/StoreContext';
import { CartDrawer } from './StorefrontPanels';
import { ProductCard } from './ProductCard';
import { formatTaka, type StorefrontCategory, type StorefrontProduct } from './types';

const emptyProducts: StorefrontProduct[] = [];
const emptyCategories: StorefrontCategory[] = [];

export function ProductListingPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
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
    categories?: StorefrontCategory[];
    showToast: (title: string, message?: string, type?: string) => void;
  };
  const products = store.products || emptyProducts;
  const savedCategories = store.categories || emptyCategories;
  const categories = useMemo(() => {
    const names = new Set<string>();
    return [...savedCategories.map((category) => category.name), ...products.map((product) => product.category)]
      .filter((name) => {
        const normalized = name.trim().toLocaleLowerCase();
        if (!normalized || names.has(normalized)) return false;
        names.add(normalized);
        return true;
      })
      .sort((first, second) => first.localeCompare(second));
  }, [products, savedCategories]);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesQuery = !query || [
        product.name,
        product.category,
        product.sku || '',
        ...(product.tags || []),
      ].some((field) => field.toLocaleLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [products, search, selectedCategory]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartSubtotal = cart.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    return sum + (product?.price || 0) * line.quantity;
  }, 0);

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get('category');
    if (requestedCategory && categories.includes(requestedCategory)) {
      setSelectedCategory(requestedCategory);
    }
  }, [categories]);

  const handleAddToCart = (product: StorefrontProduct) => {
    if (!product.stock || product.stock < 1) {
      store.showToast('Out of stock', `${product.name} is currently unavailable.`, 'warning');
      return;
    }
    if (!addToCart(product)) {
      store.showToast('Stock limit reached', `Only ${product.stock} of ${product.name} are available.`, 'warning');
      return;
    }
    store.showToast('Added to cart', `${product.name} is in your cart.`);
  };

  const handleToggleWishlist = (productId: string) => {
    const wasSaved = wishlistIds.includes(productId);
    toggleWishlist(productId);
    store.showToast(
      wasSaved ? 'Removed from wishlist' : 'Added to wishlist',
      wasSaved ? 'The item has been removed from your saved products.' : 'The item has been saved to your wishlist.',
      'info',
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F7F4] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo width={154} height={68} className="!w-[128px] bg-transparent sm:!w-[154px] [&_img]:mix-blend-multiply" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex" aria-label="Main navigation">
            <Link href="/" className="transition hover:text-emerald-900">Home</Link>
            <Link href="/products" aria-current="page" className="font-semibold text-emerald-900">All products</Link>
            <Link href="/account" className="transition hover:text-emerald-900">My account</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/account/wishlist" aria-label={`Wishlist, ${wishlistIds.length} items`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-900">
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlistIds.length > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-emerald-900 px-1 text-center text-[10px] font-bold leading-4 text-white">{wishlistIds.length}</span>}
            </Link>
            <button type="button" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${cartCount} items, subtotal ${formatTaka(cartSubtotal)}`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-900">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-emerald-900 px-1 text-center text-[10px] font-bold leading-4 text-white">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-[#022c22] via-[#064e3b] to-[#0e4e3e] px-5 py-8 text-white sm:px-8 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e8ce72]">The Anonna collection</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shop all products</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/80">Thoughtful finds for your home, wardrobe, and pantry.</p>
            </div>
            <p className="text-sm font-medium text-emerald-100">{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}</p>
          </div>
        </div>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Product filters">
            <h2 className="flex items-center gap-2 font-bold text-slate-950"><SlidersHorizontal className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Categories</h2>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Filter by category">
              {['All', ...categories].map((category) => {
                const count = category === 'All'
                  ? products.length
                  : products.filter((product) => product.category === category).length;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory === category}
                    className={`flex shrink-0 items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left text-sm transition lg:w-full ${selectedCategory === category ? 'bg-emerald-900 font-semibold text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'}`}
                  >
                    <span>{category}</span>
                    <span className={`text-xs ${selectedCategory === category ? 'text-emerald-100' : 'text-slate-400'}`}>{count}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-5 hidden border-t border-slate-100 pt-5 lg:block">
              <Link href="/account/wishlist" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 hover:text-emerald-700">
                <Heart className="h-4 w-4" aria-hidden="true" /> Your wishlist <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </aside>

          <section aria-labelledby="product-results-heading">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="product-results-heading" className="text-xl font-bold text-slate-950">
                  {selectedCategory === 'All' ? 'Browse our collection' : selectedCategory}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Select an item to see all the details.</p>
              </div>
              <label className="relative block w-full sm:max-w-xs">
                <span className="sr-only">Search products</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear product search" className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" aria-hidden="true" /></button>}
              </label>
            </div>

            {filteredProducts.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    wished={wishlistIds.includes(product.id)}
                    onView={(item) => router.push(`/products/${encodeURIComponent(item.id)}`)}
                    onToggleWishlist={handleToggleWishlist}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-slate-950">No products found</h3>
                <p className="mt-1 text-sm text-slate-600">Try a different search or category.</p>
                <button type="button" onClick={() => { setSelectedCategory('All'); setSearch(''); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-900 px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {cartOpen && (
        <CartDrawer
          products={products}
          cart={cart}
          onClose={() => setCartOpen(false)}
          onViewProduct={(product) => {
            setCartOpen(false);
            router.push(`/products/${encodeURIComponent(product.id)}`);
          }}
          onSetQuantity={setCartQuantity}
          onRemove={removeFromCart}
        />
      )}
    </div>
  );
}
