'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  BadgeCheck,
  Banknote,
  ArrowRight,
  Heart,
  Menu,
  RefreshCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { CustomerProfileMenu } from '@/components/common/CustomerProfileMenu';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useStore } from '@/components/providers/StoreContext';
import { ProductCard } from './ProductCard';
import { CartDrawer, ProductDetails, WishlistDrawer } from './StorefrontPanels';
import {
  formatTaka,
  getDiscountPercent,
  hasValidDiscount,
  type StorefrontCategory,
  type StorefrontProduct,
} from './types';

interface StoreSettings {
  supportEmail?: string;
  supportPhone?: string;
  tagline?: string;
}

const emptyProducts: StorefrontProduct[] = [];
const emptyCategories: StorefrontCategory[] = [];
const emptyProductIds: string[] = [];
function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function SectionHeading({
  eyebrow,
  title,
  headingId,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  headingId: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{eyebrow}</p>
        <h2 id={headingId} className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function formatCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function StorefrontHome() {
  const pathname = usePathname();
  const customerDemo = useCustomerDemo();
  const {
    wishlistIds,
    cart,
    toggleWishlist: toggleWishlistItem,
    addToCart: addCartItem,
    setCartQuantity: updateCartQuantity,
    removeFromCart,
  } = customerDemo;
  const store = useStore() as {
    products?: StorefrontProduct[];
    categories?: StorefrontCategory[];
    settings?: StoreSettings;
    featuredProductIds?: string[];
    visibleFeaturedProductIds?: string[];
  };
  const sourceProducts = store.products || emptyProducts;
  const sourceCategories = store.categories || emptyCategories;
  const featuredProductIds = store.featuredProductIds || emptyProductIds;
  const visibleFeaturedProductIds = store.visibleFeaturedProductIds || emptyProductIds;
  const products = useMemo(() => {
    const seenIds = new Set<string>();
    return sourceProducts.filter((product) => {
      if (seenIds.has(product.id)) return false;
      seenIds.add(product.id);
      return true;
    });
  }, [sourceProducts]);
  const categories = useMemo(() => {
    const seenNames = new Set<string>();
    return sourceCategories.filter((category) => {
      const normalizedName = normalizeLabel(category.name);
      if (seenNames.has(normalizedName)) return false;
      seenNames.add(normalizedName);
      return true;
    });
  }, [sourceCategories]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activePanel, setActivePanel] = useState<'cart' | 'wishlist' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const productsRef = useRef<HTMLElement>(null);

  const discountedProducts = useMemo(
    () => products.filter((product) => hasValidDiscount(product)),
    [products],
  );
  const featuredProducts = useMemo(
    () => featuredProductIds
      .filter((productId) => visibleFeaturedProductIds.includes(productId))
      .map((productId) => products.find((product) => product.id === productId))
      .filter((product): product is StorefrontProduct => Boolean(product))
      .slice(0, 4),
    [featuredProductIds, products, visibleFeaturedProductIds],
  );
  const featuredIds = useMemo(
    () => new Set(featuredProducts.map((product) => product.id)),
    [featuredProducts],
  );
  const offerProducts = useMemo(
    () =>
      discountedProducts
        .filter((product) => !featuredIds.has(product.id))
        .sort((first, second) => getDiscountPercent(second) - getDiscountPercent(first)),
    [discountedProducts, featuredIds],
  );
  const newProducts = useMemo(
    () =>
      [...products]
        .sort((first, second) => (second.createdAt || '').localeCompare(first.createdAt || ''))
        .slice(0, 4),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        categoryFilter === 'All' ||
        normalizeLabel(product.category) === normalizeLabel(categoryFilter);
      const searchFields = [product.name, product.category, product.sku, ...(product.tags || [])];
      const matchesQuery =
        !normalizedQuery ||
        searchFields.some((field) => field?.toLocaleLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, products, query]);

  const categoryCards = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          product: products.find(
            (product) => normalizeLabel(product.category) === normalizeLabel(category.name),
          ),
        }))
        .filter((category) => category.product),
    [categories, products],
  );
  const availableCategories = categoryCards;

  const cartRows = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = products.find((candidate) => candidate.id === line.productId);
        return product ? [{ product, quantity: line.quantity }] : [];
      }),
    [cart, products],
  );
  const cartCount = cartRows.reduce((total, row) => total + row.quantity, 0);
  const cartSubtotal = cartRows.reduce(
    (total, row) => total + row.product.price * row.quantity,
    0,
  );

  useEffect(() => {
    if (!activePanel && !selectedProduct) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePanel(null);
        setSelectedProduct(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [activePanel, selectedProduct]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search).get('search');
    if (search) setQuery(search);
  }, []);

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  const scrollToProducts = () => {
    setMobileMenuOpen(false);
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showAllProducts = () => {
    setCategoryFilter('All');
    setQuery('');
    scrollToProducts();
  };

  const selectCategory = (category: string) => {
    setCategoryFilter(category);
    setQuery('');
    setMobileMenuOpen(false);
    scrollToProducts();
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryFilter('All');
    setMobileMenuOpen(false);
    scrollToProducts();
  };

  const toggleWishlist = (productId: string) => {
    const isWished = wishlistIds.includes(productId);
    toggleWishlistItem(productId);
    const product = products.find((item) => item.id === productId);
    setAnnouncement(
      product
        ? `${product.name} ${isWished ? 'removed from' : 'added to'} your wishlist.`
        : 'Wishlist updated.',
    );
  };

  const addToCart = (product: StorefrontProduct) => {
    if (!product.stock || product.stock < 1) {
      setAnnouncement(`${product.name} is out of stock.`);
      return;
    }

    if (!addCartItem(product)) {
      setAnnouncement(`Only ${product.stock} of ${product.name} are currently available.`);
      return;
    }

    setAnnouncement(`${product.name} added to your cart.`);
  };

  const setCartQuantity = (productId: string, quantity: number) => {
    const product = products.find((item) => item.id === productId);
    if (quantity > 0 && (!product || quantity > (product.stock || 0))) return;
    updateCartQuantity(productId, quantity);
  };

  const renderSection = (options: {
    id: string;
    title: string;
    eyebrow: string;
    description: string;
    items: StorefrontProduct[];
  }) => {
    if (!options.items.length) return null;
    return (
      <section
        id={options.id}
        className="scroll-mt-36 py-7 sm:py-8"
        aria-labelledby={`${options.id}-heading`}
      >
        <SectionHeading
          headingId={`${options.id}-heading`}
          eyebrow={options.eyebrow}
          title={options.title}
          description={options.description}
          action={
            <button
              type="button"
              onClick={showAllProducts}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-sm font-semibold text-brand-800 hover:text-brand-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:self-auto"
            >
              View all products <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          }
        />
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {options.items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              wished={wishlistIds.includes(product.id)}
              onView={(item) => setSelectedProduct(item)}
              onToggleWishlist={toggleWishlist}
              onAddToCart={addToCart}
            />
          ))}
        </div>
      </section>
    );
  };

  const supportEmail = store.settings?.supportEmail;
  const supportPhone = store.settings?.supportPhone;
  const tagline = store.settings?.tagline;

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F6F7F4] text-slate-900">
      <header id="top" className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <Logo width={154} height={68} className="!w-[128px] bg-transparent sm:!w-[154px] [&_img]:mix-blend-multiply" />

          <form
            role="search"
            onSubmit={handleSearch}
            className="hidden min-w-0 flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/15 sm:flex"
          >
            <label className="sr-only" htmlFor="store-search">Search products</label>
            <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <input
              id="store-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, categories or SKU"
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                aria-label="Clear product search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button type="submit" className="sr-only">Search products</button>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-4 sm:ml-0">
            <button
              type="button"
              onClick={() => setActivePanel('wishlist')}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              aria-label={`Open wishlist, ${wishlistIds.length} items`}
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlistIds.length > 0 && (
                <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-5 text-white">
                  {formatCount(wishlistIds.length)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel('cart')}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              aria-label={`Open cart, ${cartCount} items, subtotal ${formatTaka(cartSubtotal)}`}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-brand-900 px-1 text-[10px] font-bold leading-5 text-white">
                  {formatCount(cartCount)}
                </span>
              )}
            </button>
            <div className="hidden sm:block">
              <CustomerProfileMenu />
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 lg:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
            <nav className="hidden h-12 items-center gap-8 lg:flex" aria-label="Main navigation">
              {[
                ['Home', '#top'],
                ['Categories', '#categories'],
                ['All Products', '#products'],
                ...(featuredProducts.length > 0 ? [['Featured Picks', '#featured']] : []),
                ...(offerProducts.length > 0 ? [['Offers', '#offers']] : []),
                ['New Arrivals', '#new-arrivals'],
                ['About Us', '#about'],
              ].map(([label, href]) => {
                const active = pathname === '/' && (currentHash === href || (!currentHash && href === '#top'));
                return (
                  <a
                    key={label}
                    href={href}
                    aria-current={active ? 'location' : undefined}
                    className={`relative flex h-full items-center text-sm font-medium transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-emerald-900 after:content-[''] ${
                      active
                        ? 'font-semibold text-emerald-900'
                        : 'text-slate-700 after:scale-x-0 hover:text-emerald-900'
                    }`}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>
            <form role="search" onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center gap-2 py-2 sm:hidden">
              <label className="sr-only" htmlFor="mobile-store-search">Search products</label>
              <input
                id="mobile-store-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                className="input-premium min-h-10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear product search"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button type="submit" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-white" aria-label="Search products">
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
          {mobileMenuOpen && (
            <nav className="border-t border-slate-100 bg-white px-3 py-2 lg:hidden" aria-label="Mobile navigation">
              {[
                ['Home', '#top'],
                ['Categories', '#categories'],
                ['All Products', '#products'],
                ...(featuredProducts.length > 0 ? [['Featured Picks', '#featured']] : []),
                ...(offerProducts.length ? [['Offers', '#offers']] : []),
                ['New Arrivals', '#new-arrivals'],
                ['About Us', '#about'],
              ].map(([label, href]) => (
                href.startsWith('#') ? (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                  >
                    {label}
                  </a>
                ) : (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
                      label === 'Sign Up'
                        ? 'mt-1 justify-center bg-emerald-900 text-white hover:bg-emerald-950'
                        : label === 'Login'
                          ? 'mt-1 justify-center border border-brand-800 text-brand-800 hover:bg-brand-50'
                          : 'text-brand-800 hover:bg-brand-50'
                    }`}
                  >
                    {label}
                  </Link>
                )
              ))}
              <div className="border-t border-slate-100 px-3 py-3">
                <CustomerProfileMenu />
              </div>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="mt-4 overflow-hidden rounded-2xl bg-[#064e3b] shadow-lg sm:mt-6 lg:mt-8" aria-labelledby="hero-title">
          <div className="grid min-h-[350px] lg:grid-cols-[0.95fr_1.05fr] xl:min-h-[390px]">
            <div className="flex flex-col justify-center bg-[#fbf8ed] px-6 py-8 sm:px-10 sm:py-9 lg:px-9 xl:px-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#a87913] sm:text-[11px]">
                PREMIUM PRODUCTS <span aria-hidden="true">•</span> HAPPIER LIVING
              </p>
              <h1 id="hero-title" className="mt-3 max-w-xl text-[2.4rem] font-bold leading-[0.98] tracking-tight text-[#064e3b] sm:text-5xl xl:text-[3.4rem]">
                Fresh Finds
                <span className="block text-[#a87913]">for a Better You</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-5 text-slate-700 sm:text-[15px] sm:leading-6">
                Quality products, trusted brands and everyday essentials — all in one place.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <a
                  href="#products"
                  onClick={scrollToProducts}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#064e3b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-emerald-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2"
                >
                  Shop Now <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a href="#categories" className="inline-flex min-h-10 items-center rounded-full px-2 text-sm font-semibold text-[#064e3b] underline decoration-[#064e3b]/30 underline-offset-4 transition-colors hover:decoration-[#064e3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064e3b]">
                  Explore categories
                </a>
              </div>
              <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] font-medium text-[#064e3b] sm:grid-cols-3 sm:text-[11px] lg:grid-cols-2 xl:grid-cols-3">
                {[
                  { Icon: BadgeCheck, label: 'Authentic Products' },
                  { Icon: Truck, label: 'Fast & Reliable Delivery' },
                  { Icon: Heart, label: 'Your Choice, Our Care' },
                ].map(({ Icon, label }) => (
                  <li key={label} className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[#a87913]" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative min-h-[235px] bg-[#064e3b] sm:min-h-[300px] lg:min-h-full">
              <Image
              src="/images/homedecor.jpeg"
              alt="A curated display of cozy Anonna Mart home decor and textiles"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center"
              />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#064e3b]/20 via-transparent to-transparent" />
            </div>
          </div>
        </section>

        <section className="mt-3 overflow-hidden rounded-xl bg-[#064e3b] text-white shadow-md sm:mt-4" aria-label="Special offer">
          <div className="grid lg:min-h-[132px] lg:grid-cols-[0.7fr_1.25fr_1fr]">
            <div className="relative min-h-[110px] bg-emerald-950 sm:min-h-[135px] lg:min-h-full">
            <Image
              src="/images/WhatsApp Image 2026-10-08 at 3.36.13 PM (1).jpeg"
              alt="Anonna Mart pantry products selected for the special offer"
              fill
              sizes="(max-width: 1024px) 100vw, 25vw"
              className="object-cover object-center"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent to-[#064e3b]/30 lg:bg-gradient-to-l" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-5 sm:px-7 lg:py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e5c76c]">Special offer</p>
              <h2 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Up to 30% OFF</h2>
              <p className="mt-0.5 text-xs text-white/80 sm:text-sm">Quality Products for a Better Everyday Life</p>
            </div>
            <a
              href={offerProducts.length ? '#offers' : '#products'}
              className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#D4AF37] px-4 text-xs font-semibold text-[#064e3b] transition-colors hover:bg-[#e2c35a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#064e3b] sm:text-sm"
            >
              Shop the Offer <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            </div>
            <ul className="grid gap-2 border-t border-white/15 px-5 py-4 text-xs font-medium text-white/90 sm:grid-cols-2 sm:px-7 sm:text-sm lg:grid-cols-1 lg:content-center lg:border-l lg:border-t-0 lg:px-5 lg:py-3">
            <li className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4 shrink-0 text-[#e5c76c]" aria-hidden="true" />Great Prices on Selected Items</li>
            <li className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 shrink-0 text-[#e5c76c]" aria-hidden="true" />Combo Deals Save More</li>
            <li className="inline-flex items-center gap-2"><ArrowRight className="h-4 w-4 shrink-0 text-[#e5c76c]" aria-hidden="true" />New Arrivals Every Week</li>
            </ul>
          </div>
        </section>

        <section id="categories" className="scroll-mt-36 py-7 sm:py-8" aria-labelledby="categories-heading">
          <SectionHeading
            headingId="categories-heading"
            eyebrow="Browse by interest"
            title="Shop by category"
            description="Explore the collection by the things you love."
          />
          {categoryCards.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {categoryCards.slice(0, 8).map(({ id, name, image }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => selectCategory(name)}
                  className="group relative flex aspect-[4/3] min-w-0 items-end overflow-hidden rounded-xl bg-brand-950 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover opacity-70 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="absolute inset-0 bg-gradient-to-br from-brand-800 to-brand-950" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/10 to-transparent" />
                  <span className="relative w-full break-words p-3 text-sm font-semibold leading-5 text-white sm:p-4">{name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No categories are available right now.</p>
          )}
        </section>

        {renderSection({
          id: 'featured',
          title: 'Featured picks',
          eyebrow: 'Selected for you',
          description: 'Customer favourites chosen for quality and everyday value.',
          items: featuredProducts,
        })}
        {renderSection({
          id: 'offers',
          title: 'Special offers',
          eyebrow: 'Special savings',
          description: 'Enjoy great value on selected favourites.',
          items: offerProducts,
        })}
        {renderSection({
          id: 'new-arrivals',
          title: 'New arrivals',
          eyebrow: 'Just arrived',
          description: 'Discover the latest additions to the collection.',
          items: newProducts,
        })}

        <section ref={productsRef} id="products" className="scroll-mt-36 py-7 sm:py-8" aria-labelledby="products-heading">
          <SectionHeading
            headingId="products-heading"
            eyebrow="Explore the collection"
            title="All products"
            description="Find the right essentials for your home, wardrobe and pantry."
            action={
              (query || categoryFilter !== 'All') ? (
                <button
                  type="button"
                  onClick={showAllProducts}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" /> Clear filters
                </button>
              ) : undefined
            }
          />

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap gap-2" aria-label="Filter products by category">
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                aria-pressed={categoryFilter === 'All'}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${categoryFilter === 'All' ? 'bg-brand-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50'}`}
              >
                All
              </button>
              {availableCategories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setCategoryFilter(category.name)}
                  aria-pressed={categoryFilter === category.name}
                  className={`min-h-10 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${categoryFilter === category.name ? 'bg-brand-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <p className="shrink-0 text-sm text-slate-500" aria-live="polite">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </p>
          </div>

          {query && (
            <p className="mb-4 text-sm text-slate-600" aria-live="polite">
              Search results for “{query}”
            </p>
          )}
          {filteredProducts.length ? (
            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  wished={wishlistIds.includes(product.id)}
                  onView={setSelectedProduct}
                  onToggleWishlist={toggleWishlist}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-slate-900">No matching products</h3>
              <p className="mt-1 text-sm text-slate-600">Try another name, SKU or category.</p>
              <button type="button" onClick={showAllProducts} className="btn-secondary mt-4">Show all products</button>
            </div>
          )}
        </section>

        <section id="about" className="scroll-mt-36 border-y border-slate-200 py-9 sm:py-11" aria-labelledby="about-heading">
          <SectionHeading
            headingId="about-heading"
            eyebrow="The Anonna Mart promise"
            title="Why Choose Anonna Mart"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Truck, label: 'Free Delivery Over ৳1000' },
              { Icon: BadgeCheck, label: '100% Authentic Products' },
              { Icon: Banknote, label: 'Cash on Delivery' },
              { Icon: RefreshCcw, label: 'Easy Returns' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold leading-5 text-slate-900">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative mt-0 overflow-hidden bg-[#064e3b] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-0 w-20 sm:w-40 lg:w-56">
          <div className="absolute inset-x-0 bottom-0 h-[190px] sm:top-0 sm:h-full">
            <Image
              src="/images/footer-leaves.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 224px, (min-width: 640px) 160px, 80px"
              className="h-full w-full object-cover opacity-80 brightness-125 saturate-150 mix-blend-screen sm:opacity-100"
              style={{
                maskImage: 'radial-gradient(ellipse 115% 135% at 0% 80%, #000 0%, #000 32%, transparent 82%)',
                WebkitMaskImage: 'radial-gradient(ellipse 115% 135% at 0% 80%, #000 0%, #000 32%, transparent 82%)',
              }}
            />
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-0 w-20 sm:w-40 lg:w-56">
          <div
            className="absolute inset-x-0 bottom-0 h-[190px] sm:top-0 sm:h-full"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, #000 40%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 40%)',
            }}
          >
            <Image
              src="/images/footer-leaves.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 224px, (min-width: 640px) 160px, 80px"
              className="h-full w-full -scale-x-100 object-cover opacity-80 brightness-125 saturate-150 mix-blend-screen sm:opacity-100"
            />
          </div>
        </div>
        <div className="relative z-10 mx-auto grid min-h-[150px] w-full gap-6 px-6 py-5 sm:grid-cols-2 sm:px-8 lg:h-[150px] lg:min-h-0 lg:w-[65%] lg:grid-cols-[2fr_1.25fr_1fr] lg:items-start lg:gap-0 lg:px-0 lg:pt-[26px]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo width={106} height={52} className="rounded-md bg-white" />
            <p className="mt-[13px] max-w-sm text-sm leading-5 text-white/90">
              {tagline || 'Thoughtful finds for everyday living.'}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Explore</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-white/85">
              <li><a href="#categories" className="hover:text-white">Categories</a></li>
              <li><a href="#products" className="hover:text-white">All products</a></li>
              {offerProducts.length > 0 && <li><a href="#offers" className="hover:text-white">Special offers</a></li>}
              <li><a href="#new-arrivals" className="hover:text-white">Recent additions</a></li>
            </ul>
          </div>
          {(supportEmail || supportPhone) && (
            <div>
              <h2 className="text-sm font-semibold text-white">Customer support</h2>
              <div className="mt-2 space-y-1.5 text-sm text-white/85">
                {supportEmail && <a className="block break-all hover:text-white" href={`mailto:${supportEmail}`}>{supportEmail}</a>}
                {supportPhone && <a className="block hover:text-white" href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`}>{supportPhone}</a>}
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 flex h-[39px] items-center justify-center border-t border-white/15 px-4 text-center text-[10px] text-white/85">
          © {new Date().getFullYear()} Anonna Mart. All rights reserved.
        </div>
      </footer>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      {activePanel === 'cart' && (
        <CartDrawer
          products={products}
          cart={cart}
          onClose={() => setActivePanel(null)}
          onViewProduct={(product) => {
            setActivePanel(null);
            setSelectedProduct(product);
          }}
          onSetQuantity={setCartQuantity}
          onRemove={removeFromCart}
        />
      )}
      {activePanel === 'wishlist' && (
        <WishlistDrawer
          products={products}
          wishlistIds={wishlistIds}
          onClose={() => setActivePanel(null)}
          onViewProduct={(product) => {
            setActivePanel(null);
            setSelectedProduct(product);
          }}
          onToggleWishlist={toggleWishlist}
          onAddToCart={addToCart}
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
