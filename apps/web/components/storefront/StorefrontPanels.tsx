'use client';

import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { ProductThumbnail } from './ProductCard';
import { formatTaka, type CartLine, type StorefrontProduct } from './types';

interface DrawerProps {
  products: StorefrontProduct[];
  onClose: () => void;
  onViewProduct: (product: StorefrontProduct) => void;
}

interface CartDrawerProps extends DrawerProps {
  cart: CartLine[];
  onSetQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

function DrawerFrame({
  title,
  onClose,
  children,
  labelledBy,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onKeyDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close panel"
        className="absolute inset-0 cursor-default bg-slate-950/50"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 px-5">
          <h2 id={labelledBy} className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function CartDrawer({
  products,
  cart,
  onClose,
  onViewProduct,
  onSetQuantity,
  onRemove,
}: CartDrawerProps) {
  const rows = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ product, quantity: line.quantity }] : [];
  });
  const subtotal = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const itemCount = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <DrawerFrame title={`Shopping cart (${itemCount})`} labelledBy="cart-title" onClose={onClose}>
      {rows.length ? (
        <>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
            {rows.map(({ product, quantity }) => (
              <li key={product.id} className="flex gap-3 py-4">
                <button
                  type="button"
                  onClick={() => onViewProduct(product)}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                  aria-label={`View ${product.name}`}
                >
                  <ProductThumbnail product={product} className="h-full w-full object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-sm font-bold text-brand-900">{formatTaka(product.price)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-md border border-slate-200">
                      <button
                        type="button"
                        onClick={() => onSetQuantity(product.id, quantity - 1)}
                        aria-label={`Decrease ${product.name} quantity`}
                        className="inline-flex h-9 w-9 items-center justify-center hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="min-w-8 text-center text-sm" aria-label={`Quantity ${quantity}`}>{quantity}</span>
                      <button
                        type="button"
                        onClick={() => onSetQuantity(product.id, quantity + 1)}
                        disabled={quantity >= (product.stock || 0)}
                        aria-label={`Increase ${product.name} quantity`}
                        className="inline-flex h-9 w-9 items-center justify-center hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(product.id)}
                      aria-label={`Remove ${product.name} from cart`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-200 p-5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal ({itemCount} items)</span>
              <span className="font-bold text-slate-900">{formatTaka(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Delivery charges, if applicable, are calculated at checkout.</p>
            <button
              type="button"
              disabled
              className="mt-4 min-h-11 w-full cursor-not-allowed rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-500"
              title="Checkout is currently unavailable"
            >
              Checkout currently unavailable
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <ShoppingBag className="h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="mt-4 font-semibold text-slate-900">Your cart is empty</p>
          <p className="mt-1 text-sm text-slate-500">Add an in-stock product to see it here.</p>
          <button type="button" onClick={onClose} className="btn-primary mt-5">Continue browsing</button>
        </div>
      )}
    </DrawerFrame>
  );
}

export function WishlistDrawer({
  products,
  onClose,
  onViewProduct,
  onToggleWishlist,
  onAddToCart,
  wishlistIds,
}: DrawerProps & {
  wishlistIds: string[];
  onToggleWishlist: (id: string) => void;
  onAddToCart: (product: StorefrontProduct) => void;
}) {
  const wishedProducts = products.filter((product) => wishlistIds.includes(product.id));

  return (
    <DrawerFrame title={`Wishlist (${wishedProducts.length})`} labelledBy="wishlist-title" onClose={onClose}>
      {wishedProducts.length ? (
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
          {wishedProducts.map((product) => (
            <li key={product.id} className="flex gap-3 py-4">
              <button
                type="button"
                onClick={() => onViewProduct(product)}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                aria-label={`View ${product.name}`}
              >
                <ProductThumbnail product={product} className="h-full w-full object-cover" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
                <p className="mt-1 text-sm font-bold text-brand-900">{formatTaka(product.price)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onAddToCart(product)} disabled={!product.stock} className="text-xs font-semibold text-brand-800 underline underline-offset-2 disabled:text-slate-400">
                    Add to cart
                  </button>
                  <button type="button" onClick={() => onToggleWishlist(product.id)} className="text-xs font-semibold text-slate-500 underline underline-offset-2">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="font-semibold text-slate-900">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-slate-500">Save products with the heart button.</p>
          <button type="button" onClick={onClose} className="btn-primary mt-5">Continue browsing</button>
        </div>
      )}
    </DrawerFrame>
  );
}

export function ProductDetails({
  product,
  wished,
  onClose,
  onToggleWishlist,
  onAddToCart,
}: {
  product: StorefrontProduct;
  wished: boolean;
  onClose: () => void;
  onToggleWishlist: (id: string) => void;
  onAddToCart: (product: StorefrontProduct) => void;
}) {
  const soldOut = !product.stock || product.stock < 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close product details"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-slate-950/55"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        className="relative grid w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2"
      >
        <div className="relative aspect-square bg-slate-100 md:aspect-auto md:min-h-[400px]">
          <ProductThumbnail product={product} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col p-5 sm:p-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="pr-12 text-sm font-semibold text-brand-700">{product.category}</p>
          <h2 id="product-details-title" className="mt-2 text-xl font-bold text-slate-900">{product.name}</h2>
          <p className="mt-4 text-2xl font-bold text-brand-950">{formatTaka(product.price)}</p>
          {product.description && <p className="mt-4 text-sm leading-6 text-slate-600">{product.description}</p>}
          <p className={`mt-4 text-sm font-medium ${soldOut ? 'text-rose-700' : 'text-emerald-800'}`}>
            {soldOut ? 'Out of stock' : 'In stock'}
          </p>
          {product.sku && <p className="mt-2 text-xs text-slate-500">SKU: {product.sku}</p>}
          {product.tags?.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <li key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{tag}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-7">
            <button type="button" onClick={() => onAddToCart(product)} disabled={soldOut} className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => onToggleWishlist(product.id)}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={wished}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${wished ? 'border-rose-200 text-rose-600' : 'border-slate-200 text-slate-600'}`}
            >
              <span className="sr-only">{wished ? 'Remove from wishlist' : 'Add to wishlist'}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 ${wished ? 'fill-current' : 'fill-none'}`} stroke="currentColor" strokeWidth="2">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
