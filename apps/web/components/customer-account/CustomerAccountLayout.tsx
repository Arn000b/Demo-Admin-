'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Heart,
  MapPin,
  Package,
  UserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { CustomerProfileMenu } from '@/components/common/CustomerProfileMenu';
import { CartDrawer, ProductDetails } from '@/components/storefront/StorefrontPanels';
import { formatTaka, type StorefrontProduct } from '@/components/storefront/types';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useStore } from '@/components/providers/StoreContext';
import { useAuth } from '@/context/auth-context';

const siteLinks = [
  { href: '/', label: 'Home' },
  { href: '/#categories', label: 'Categories' },
  { href: '/#products', label: 'Products' },
  { href: '/#offers', label: 'Offers' },
  { href: '/#new-arrivals', label: 'New Arrivals' },
  { href: '/#about', label: 'About Us' },
];

const accountLinks = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/orders', label: 'My orders', icon: Package },
  { href: '/account/profile', label: 'My profile', icon: UserRound },
  { href: '/account/addresses', label: 'Saved addresses', icon: MapPin },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
];

export function CustomerAccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const {
    wishlistIds,
    cart,
    setCartQuantity,
    removeFromCart,
    toggleWishlist,
    addToCart,
    signOut: clearCustomerState,
  } = useCustomerDemo();
  const store = useStore() as { products?: StorefrontProduct[] };
  const products = store.products || [];
  const { logout } = useAuth();
  const cartCount = cart.reduce((count, line) => count + line.quantity, 0);
  const cartSubtotal = cart.reduce((subtotal, line) => {
    const product = products.find((item) => item.id === line.productId);
    return subtotal + (product?.price || 0) * line.quantity;
  }, 0);

  const handleSignOut = () => {
    logout();
    clearCustomerState();
    router.replace('/');
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = searchQuery.trim();
    router.push(value ? `/?search=${encodeURIComponent(value)}#products` : '/#products');
  };

  useEffect(() => {
    const search = new URLSearchParams(window.location.search).get('search');
    if (search) setSearchQuery(search);
  }, []);

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7F4] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <Logo width={154} height={68} className="!w-[112px] bg-transparent sm:!w-[154px] [&_img]:mix-blend-multiply" />
          <form role="search" onSubmit={handleSearch} className="hidden min-w-0 max-w-2xl flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15 sm:flex">
            <label className="sr-only" htmlFor="account-site-search">Search products, categories or SKU</label>
            <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <input
              id="account-site-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products, categories or SKU"
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button type="submit" className="sr-only">Search products</button>
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-2">
            <Link
              href="/account/wishlist"
              aria-label={`Open wishlist, ${wishlistIds.length} items`}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlistIds.length > 0 && <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{wishlistIds.length}</span>}
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${cartCount} items, subtotal ${formatTaka(cartSubtotal)}`}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-emerald-900 px-1 text-center text-[10px] font-bold leading-5 text-white">{cartCount}</span>}
            </button>
            <div className="hidden sm:block">
              <CustomerProfileMenu />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
            <nav aria-label="Main navigation" className="hidden h-12 items-center gap-8 lg:flex">
              {siteLinks.map(({ href, label }) => (
                <Link
                  key={label}
                  href={href}
                  aria-current={
                    pathname === '/' &&
                    (href === '/'
                      ? !currentHash
                      : currentHash === new URL(href, 'https://anonnamart.com').hash)
                      ? 'location'
                      : undefined
                  }
                  className={`relative flex h-full items-center whitespace-nowrap text-sm font-medium transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-emerald-900 after:content-[''] ${
                    pathname === '/' &&
                    (href === '/'
                      ? !currentHash
                      : currentHash === new URL(href, 'https://anonnamart.com').hash)
                      ? 'font-semibold text-emerald-900'
                      : 'text-slate-700 after:scale-x-0 hover:text-emerald-900'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <form role="search" onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center gap-2 py-2 sm:hidden">
              <label className="sr-only" htmlFor="account-mobile-search">Search products</label>
              <input
                id="account-mobile-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products"
                className="input-premium min-h-10"
              />
              <button type="submit" aria-label="Search products" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-white">
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav aria-label="Mobile navigation" className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-1">
              {siteLinks.map(({ href, label }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  {label}
                </Link>
              ))}
              <div className="mt-2 border-t border-slate-100 px-3 pt-3 sm:hidden">
                <CustomerProfileMenu />
              </div>
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <aside className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 lg:self-start">
            <nav aria-label="Customer account navigation" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {accountLinks.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                      active
                        ? 'bg-emerald-900 font-medium text-white shadow-sm'
                        : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-emerald-800'}`} aria-hidden="true" />
                    <span>{label}</span>
                    {href === '/account/wishlist' && wishlistIds.length > 0 && (
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-900'}`}>{wishlistIds.length}</span>
                    )}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 lg:mt-2 lg:border-t lg:border-slate-100 lg:pt-2"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign Out
              </button>
            </nav>
          </aside>

          <main id="customer-account-main" className="min-w-0">{children}</main>
        </div>
      </div>
      {cartOpen && (
        <CartDrawer
          products={products}
          cart={cart}
          onClose={() => setCartOpen(false)}
          onViewProduct={(product) => {
            setCartOpen(false);
            setSelectedProduct(product);
          }}
          onSetQuantity={setCartQuantity}
          onRemove={removeFromCart}
        />
      )}
      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          wished={wishlistIds.includes(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onToggleWishlist={toggleWishlist}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}
