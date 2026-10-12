'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  GripVertical,
  ImageIcon,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useStore } from '@/components/providers/StoreContext';
import { formatCurrency } from '@/lib/utils/formatters';
import type { StorefrontProduct } from '@/components/storefront/types';

export function FeaturedProductsManagement() {
  const {
    products,
    featuredProductIds,
    visibleFeaturedProductIds,
    addFeaturedProduct,
    removeFeaturedProduct,
    toggleFeaturedProductVisibility,
    moveFeaturedProduct,
  } = useStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const catalogProducts = useMemo<StorefrontProduct[]>(
    () => Array.isArray(products) ? products as StorefrontProduct[] : [],
    [products]
  );
  const featuredIds = useMemo(
    () => Array.isArray(featuredProductIds)
      ? featuredProductIds.filter((productId): productId is string => typeof productId === 'string')
      : [],
    [featuredProductIds]
  );
  const visibleFeaturedIds = useMemo(
    () => Array.isArray(visibleFeaturedProductIds)
      ? visibleFeaturedProductIds.filter((productId): productId is string => typeof productId === 'string')
      : [],
    [visibleFeaturedProductIds]
  );

  const featuredProducts = useMemo(
    () => featuredIds
      .map(productId => catalogProducts.find(product => product.id === productId))
      .filter((product): product is StorefrontProduct => Boolean(product)),
    [featuredIds, catalogProducts]
  );

  const availableProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return catalogProducts.filter(product => {
      if (featuredIds.includes(product.id)) return false;
      return !normalizedSearch || [product.name, product.category, product.sku]
        .some(value => value?.toLocaleLowerCase().includes(normalizedSearch));
    });
  }, [featuredIds, catalogProducts, search]);

  useEffect(() => {
    if (!pickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pickerOpen]);

  const addProduct = (productId: string) => {
    addFeaturedProduct(productId);
    setSearch('');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950 sm:text-3xl">
            Featured Picks Management
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Curate and reorder products shown in the Homepage featured section.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#064e3b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Featured Product
        </button>
      </header>

      <section
        aria-label="Featured products"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">Homepage featured product order and visibility</caption>
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="w-28 px-4 py-3">Order</th>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="w-48 px-4 py-3">Price</th>
                <th scope="col" className="w-52 px-4 py-3">Homepage Visibility</th>
                <th scope="col" className="w-24 px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {featuredProducts.length ? featuredProducts.map((product, index) => {
                const visible = visibleFeaturedIds.includes(product.id);
                const hasDiscount = typeof product.originalPrice === 'number' && product.originalPrice > product.price;
                const discount = hasDiscount && product.originalPrice
                  ? Math.round((1 - product.price / product.originalPrice) * 100)
                  : 0;

                return (
                  <tr
                    key={product.id}
                    onDragOver={(event) => {
                      if (draggedProductId) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggedProductId || draggedProductId === product.id) return;
                      const fromIndex = featuredIds.indexOf(draggedProductId);
                      const toIndex = featuredIds.indexOf(product.id);
                      if (fromIndex !== -1 && toIndex !== -1) {
                        moveFeaturedProduct(draggedProductId, toIndex - fromIndex);
                      }
                      setDraggedProductId(null);
                    }}
                    className={`transition-colors hover:bg-slate-50/70 ${draggedProductId === product.id ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                            setDraggedProductId(product.id);
                          }}
                          onDragEnd={() => setDraggedProductId(null)}
                          aria-label={`Drag to reorder ${product.name}`}
                          className="inline-flex h-8 w-6 cursor-grab items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                        >
                          <GripVertical className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="text-sm font-semibold tabular-nums text-slate-600">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                          {product.image ? (
                            // Catalog images may come from any configured store URL.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h2 className="line-clamp-1 text-sm font-semibold text-slate-900">{product.name}</h2>
                          <span className="mt-1 inline-flex max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {product.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-bold text-brand-950">{formatCurrency(product.price)}</span>
                        {hasDiscount && (
                          <>
                            <span className="text-xs text-slate-400 line-through">{formatCurrency(product.originalPrice)}</span>
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              {discount}% off
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={visible}
                          aria-label={`${visible ? 'Hide' : 'Show'} ${product.name} on homepage`}
                          onClick={() => toggleFeaturedProductVisibility(product.id)}
                          className="inline-flex h-10 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                        >
                          <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${visible ? 'bg-emerald-800' : 'bg-slate-300'}`}>
                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${visible ? 'translate-x-5' : 'translate-x-0.5'}`}>
                              {visible && <Check className="h-3 w-3 text-emerald-800" aria-hidden="true" />}
                            </span>
                          </span>
                        </button>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${visible ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {visible ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeFeaturedProduct(product.id)}
                        className="inline-flex min-h-9 items-center justify-center rounded-lg px-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <h2 className="font-semibold text-slate-900">No featured products yet</h2>
                    <p className="mt-1 text-sm text-slate-500">Add products from your catalog to curate the homepage.</p>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#064e3b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-950"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add Featured Product
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setPickerOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="featured-picker-title"
            className="my-auto flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="featured-picker-title" className="text-lg font-bold text-slate-950">Add a featured product</h2>
                <p className="mt-1 text-sm text-slate-500">Search your catalog and add products to Homepage Featured Picks.</p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close product picker"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <label className="mx-5 mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15 sm:mx-6">
              <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="sr-only">Search products</span>
              <input
                autoFocus
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by product, category or SKU"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5 sm:p-6">
              {availableProducts.length ? availableProducts.map(product => (
                <article key={product.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                    {product.image ? (
                      // Product images are managed in the catalog and may come from any configured store URL.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{product.category} · {formatCurrency(product.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProduct(product.id)}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add to Featured
                  </button>
                </article>
              )) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  {catalogProducts.length === featuredIds.length
                    ? 'All catalog products are already featured.'
                    : 'No catalog products match your search.'}
                </p>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
