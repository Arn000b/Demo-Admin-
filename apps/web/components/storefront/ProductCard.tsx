'use client';

import { useState } from 'react';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import {
  formatTaka,
  getDiscountPercent,
  hasValidDiscount,
  type StorefrontProduct,
} from './types';

function ProductImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className} flex items-center justify-center bg-brand-50 px-4 text-center text-sm font-medium text-brand-800`}
      >
        Anonna Mart
      </div>
    );
  }

  return (
    // Product image URLs are provided by the store catalog and are not restricted to a configured image host.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

interface ProductCardProps {
  product: StorefrontProduct;
  wished: boolean;
  onView: (product: StorefrontProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: StorefrontProduct) => void;
}

export function ProductCard({
  product,
  wished,
  onView,
  onToggleWishlist,
  onAddToCart,
}: ProductCardProps) {
  const hasDiscount = hasValidDiscount(product);
  const soldOut = !product.stock || product.stock < 1;

  return (
    <article className="group flex h-full w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-card">
      <div className="relative">
        <button
          type="button"
          onClick={() => onView(product)}
          className="block aspect-square w-full overflow-hidden bg-slate-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700"
          aria-label={`View ${product.name}`}
        >
          <ProductImage
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>
        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-md bg-gold-400 px-2 py-1 text-xs font-bold text-brand-950">
            {getDiscountPercent(product)}% off
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
          className={`absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
            wished ? 'border-rose-200 text-rose-600' : 'border-slate-200 text-slate-600 hover:text-rose-600'
          }`}
        >
          <Heart className={`h-5 w-5 ${wished ? 'fill-current' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <button
          type="button"
          onClick={() => onView(product)}
          className="mb-1 line-clamp-1 self-start text-left text-xs font-medium text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
        >
          {product.category}
        </button>
        <button
          type="button"
          onClick={() => onView(product)}
          className="line-clamp-2 min-h-10 min-w-0 text-left text-sm font-semibold leading-5 text-slate-900 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
        >
          {product.name}
        </button>

        {typeof product.rating === 'number' && (
          <p
            className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600"
            aria-label={`Rated ${product.rating.toFixed(1)} out of 5${product.reviewsCount ? ` based on ${product.reviewsCount} reviews` : ''}`}
          >
            <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-600" aria-hidden="true" />
            <span>{product.rating.toFixed(1)}</span>
            {product.reviewsCount ? (
              <span className="text-slate-500">({product.reviewsCount} reviews)</span>
            ) : null}
          </p>
        )}

        <div className="mt-auto pt-3">
          <div className="flex min-h-7 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="whitespace-nowrap text-sm font-bold text-brand-950 sm:text-base">{formatTaka(product.price)}</span>
            {hasDiscount && product.originalPrice !== undefined && (
              <span className="whitespace-nowrap text-[11px] text-slate-400 line-through sm:text-xs">
                {formatTaka(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={soldOut}
            className="mt-3 inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1 rounded-lg bg-brand-900 px-2 text-xs font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductThumbnail({
  product,
  className,
}: {
  product: StorefrontProduct;
  className: string;
}) {
  return <ProductImage src={product.image} alt={product.name} className={className} />;
}
