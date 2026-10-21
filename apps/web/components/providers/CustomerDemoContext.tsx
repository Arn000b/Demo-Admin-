'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CartLine, StorefrontProduct } from '@/components/storefront/types';
import { useAuth } from '@/context/auth-context';
import {
  fetchCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  fetchWishlists,
  addWishlistItem,
  removeWishlistItem,
  type CartResponse,
} from '@/lib/api/commerce';
import { fetchProductVariants } from '@/lib/api/products';

export interface DemoCustomerProfile {
  name: string;
  email: string;
  phone: string;
}

export interface DemoAddress {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

interface CustomerDemoContextValue {
  wishlistIds: string[];
  cart: CartLine[];
  profile: DemoCustomerProfile;
  addresses: DemoAddress[];
  toggleWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  addToCart: (product: StorefrontProduct) => boolean;
  setCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  updateProfile: (profile: DemoCustomerProfile) => void;
  saveAddress: (address: DemoAddress) => void;
  deleteAddress: (addressId: string) => void;
  setDefaultAddress: (addressId: string) => void;
  signOut: () => void;
}

const CustomerDemoContext = createContext<CustomerDemoContextValue | null>(null);

const initialProfile: DemoCustomerProfile = {
  name: '',
  email: '',
  phone: '',
};

export function CustomerDemoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [profile, setProfile] = useState(initialProfile);
  const [addresses, setAddresses] = useState<DemoAddress[]>([]);
  const activeWishlistIdRef = useRef<string | null>(null);

  // Sync profile when auth user changes
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Sync cart and wishlist from backend when authenticated
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadCustomerCommerceData() {
      try {
        const [cartResult, wishlistsResult] = await Promise.allSettled([
          fetchCart(),
          fetchWishlists(),
        ]);
        if (!isMounted) return;

        if (cartResult.status === 'fulfilled' && cartResult.value?.items) {
          const remoteCart: CartResponse = cartResult.value;
          if (remoteCart.items.length > 0) {
            setCart(
              remoteCart.items.map((item) => ({
                productId: item.variantId,
                quantity: item.quantity,
                variantId: item.variantId,
                cartItemId: item.id,
              }))
            );
          }
        }

        if (wishlistsResult.status === 'fulfilled' && wishlistsResult.value.length > 0) {
          const defaultList = wishlistsResult.value[0];
          if (defaultList) {
            activeWishlistIdRef.current = defaultList.id;
            // Extract items if present
            const items = (
              defaultList as unknown as { items?: { productId?: string; variantId?: string }[] }
            ).items;
            if (Array.isArray(items)) {
              const ids = items.flatMap((i) =>
                i.productId ? [i.productId] : i.variantId ? [i.variantId] : []
              );
              setWishlistIds((prev) => Array.from(new Set([...prev, ...ids])));
            }
          }
        }
      } catch {
        // Fallback to local state if backend cart/wishlist is not reachable
      }
    }

    loadCustomerCommerceData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const addToCart = (product: StorefrontProduct) => {
    if (!product.stock || product.stock < 1) return false;
    const line = cart.find((item) => item.productId === product.id);
    if (line && line.quantity >= product.stock) return false;

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing) return [...current, { productId: product.id, quantity: 1 }];
      if (existing.quantity >= (product.stock || 0)) return current;
      return current.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    });

    // If authenticated, push to backend API asynchronously
    if (user) {
      (async () => {
        try {
          // Check if product.id is a UUID or if variants should be looked up
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            product.id
          );
          let targetVariantId: string | null = isUuid ? product.id : null;
          if (!targetVariantId) {
            const variants = await fetchProductVariants(product.id).catch(() => []);
            if (variants.length > 0 && variants[0]?.id) {
              targetVariantId = variants[0].id;
            }
          }
          if (targetVariantId) {
            await addCartItem(targetVariantId, 1);
            // Refresh cart to get assigned cartItemId
            const fresh = await fetchCart();
            if (fresh?.items) {
              setCart(
                fresh.items.map((i) => ({
                  productId: i.variantId,
                  quantity: i.quantity,
                  variantId: i.variantId,
                  cartItemId: i.id,
                }))
              );
            }
          }
        } catch {
          // Keep local cart state even if backend API sync is delayed
        }
      })();
    }

    return true;
  };

  const setCartQuantity = (productId: string, quantity: number) => {
    const existing = cart.find((item) => item.productId === productId);
    if (quantity < 1) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      if (user && existing?.cartItemId) {
        removeCartItem(existing.cartItemId).catch(() => null);
      }
      return;
    }
    setCart((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
    if (user && existing?.cartItemId) {
      updateCartItem(existing.cartItemId, quantity).catch(() => null);
    }
  };

  const saveAddress = (address: DemoAddress) => {
    setAddresses((current) => {
      const updated = current.some((item) => item.id === address.id)
        ? current.map((item) => (item.id === address.id ? address : item))
        : [...current, address];
      const defaultId =
        address.isDefault || !updated.some((item) => item.isDefault)
          ? address.id
          : updated.find((item) => item.isDefault)?.id;
      return updated.map((item) => ({ ...item, isDefault: item.id === defaultId }));
    });
  };

  const toggleWishlist = (productId: string) => {
    setWishlistIds((current) => {
      const exists = current.includes(productId);
      const next = exists ? current.filter((id) => id !== productId) : [...current, productId];

      if (user && activeWishlistIdRef.current) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          productId
        );
        if (isUuid) {
          if (!exists) {
            addWishlistItem(activeWishlistIdRef.current, { productId }).catch(() => null);
          }
        }
      }
      return next;
    });
  };

  const value: CustomerDemoContextValue = {
    wishlistIds,
    cart,
    profile,
    addresses,
    toggleWishlist,
    removeFromWishlist: (productId) =>
      setWishlistIds((current) => current.filter((id) => id !== productId)),
    addToCart,
    setCartQuantity,
    removeFromCart: (productId) => {
      const existing = cart.find((item) => item.productId === productId);
      setCart((current) => current.filter((item) => item.productId !== productId));
      if (user && existing?.cartItemId) {
        removeCartItem(existing.cartItemId).catch(() => null);
      }
    },
    clearCart: () => setCart([]),
    updateProfile: setProfile,
    saveAddress,
    deleteAddress: (addressId) =>
      setAddresses((current) => {
        const remaining = current.filter((item) => item.id !== addressId);
        if (remaining.length && !remaining.some((item) => item.isDefault)) {
          remaining[0] = { ...remaining[0], isDefault: true };
        }
        return remaining;
      }),
    setDefaultAddress: (addressId) =>
      setAddresses((current) =>
        current.map((item) => ({ ...item, isDefault: item.id === addressId }))
      ),
    signOut: () => {
      setWishlistIds([]);
      setCart([]);
      setProfile(initialProfile);
      setAddresses([]);
      activeWishlistIdRef.current = null;
    },
  };

  return <CustomerDemoContext.Provider value={value}>{children}</CustomerDemoContext.Provider>;
}

export function useCustomerDemo() {
  const context = useContext(CustomerDemoContext);
  if (!context) {
    throw new Error('useCustomerDemo must be used within a CustomerDemoProvider');
  }
  return context;
}
