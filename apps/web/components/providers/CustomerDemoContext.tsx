'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CartLine, StorefrontProduct } from '@/components/storefront/types';

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
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [profile, setProfile] = useState(initialProfile);
  const [addresses, setAddresses] = useState<DemoAddress[]>([]);

  const addToCart = (product: StorefrontProduct) => {
    if (!product.stock || product.stock < 1) return false;
    const line = cart.find((item) => item.productId === product.id);
    if (line && line.quantity >= product.stock) return false;

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing) return [...current, { productId: product.id, quantity: 1 }];
      if (existing.quantity >= (product.stock || 0)) return current;
      return current.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
    return true;
  };

  const setCartQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      return;
    }
    setCart((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
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

  const value: CustomerDemoContextValue = {
    wishlistIds,
    cart,
    profile,
    addresses,
    toggleWishlist: (productId) =>
      setWishlistIds((current) =>
        current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId],
      ),
    removeFromWishlist: (productId) =>
      setWishlistIds((current) => current.filter((id) => id !== productId)),
    addToCart,
    setCartQuantity,
    removeFromCart: (productId) =>
      setCart((current) => current.filter((item) => item.productId !== productId)),
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
        current.map((item) => ({ ...item, isDefault: item.id === addressId })),
      ),
    signOut: () => {
      setWishlistIds([]);
      setCart([]);
      setProfile(initialProfile);
      setAddresses([]);
    },
  };

  return (
    <CustomerDemoContext.Provider value={value}>
      {children}
    </CustomerDemoContext.Provider>
  );
}

export function useCustomerDemo() {
  const context = useContext(CustomerDemoContext);
  if (!context) {
    throw new Error('useCustomerDemo must be used within a CustomerDemoProvider');
  }
  return context;
}
