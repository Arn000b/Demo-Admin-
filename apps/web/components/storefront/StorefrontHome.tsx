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
                ['Products', '#products'],
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
                ['Products', '#products'],
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
        <section className="relative isolate mt-4 flex min-h-[340px] items-center overflow-hidden rounded-2xl bg-emerald-950 shadow-lg sm:mt-6 sm:min-h-[400px] lg:mt-8 lg:min-h-[440px]" aria-labelledby="hero-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=2000&q=85"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-950/90 via-emerald-950/75 to-emerald-950/30" />
          <div className="relative w-full px-5 py-10 text-left sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs tracking-wide text-white/90 ring-1 ring-white/15">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Authentic &amp; Premium Quality
              </span>
              <h1 id="hero-title" className="mt-5 max-w-xl text-3xl font-bold leading-tight text-white sm:text-5xl">
                Discover thoughtful finds for everyday living
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                Browse our curated collection of home, fashion, and organic pantry favorites.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#products"
                  onClick={scrollToProducts}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#D4AF37] px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-[#c49f27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950"
                >
                  Shop products <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a href="#categories" className="inline-flex min-h-12 items-center rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Explore categories
                </a>
              </div>
            </div>
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
              {categoryCards.slice(0, 8).map(({ id, name, product }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => selectCategory(name)}
                  className="group relative flex aspect-[4/3] min-w-0 items-end overflow-hidden rounded-xl bg-brand-950 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                >
                  {product?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105" />
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

      <footer className="mt-8 bg-brand-950 text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-9 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div className="sm:col-span-2 lg:col-span-2">
            <Logo width={166} height={72} className="rounded-md bg-white" />
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">
              {tagline || 'Thoughtful finds for everyday living.'}
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-white">Explore</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li><a href="#categories" className="hover:text-white">Categories</a></li>
              <li><a href="#products" className="hover:text-white">All products</a></li>
              {offerProducts.length > 0 && <li><a href="#offers" className="hover:text-white">Special offers</a></li>}
              <li><a href="#new-arrivals" className="hover:text-white">Recent additions</a></li>
            </ul>
          </div>
          {(supportEmail || supportPhone) && (
            <div>
              <h2 className="font-semibold text-white">Customer support</h2>
              <div className="mt-3 space-y-2 text-sm text-white/75">
                {supportEmail && <a className="block break-all hover:text-white" href={`mailto:${supportEmail}`}>{supportEmail}</a>}
                {supportPhone && <a className="block hover:text-white" href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`}>{supportPhone}</a>}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/60">
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
