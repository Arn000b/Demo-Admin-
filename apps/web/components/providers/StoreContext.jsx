'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_CUSTOMERS,
  INITIAL_VENDORS,
  INITIAL_BANNERS,
  INITIAL_COUPONS,
  STORE_SETTINGS
} from '@/lib/data/mockData';

const StoreContext = createContext();

const isBrowser = typeof window !== 'undefined';
const safeGetItem = (key) => isBrowser ? localStorage.getItem(key) : null;
const safeSetItem = (key, value) => {
  if (isBrowser) localStorage.setItem(key, value);
};

const DEFAULT_PROFILE = {
  name: 'Anonna Rahman',
  email: 'anonna@anonnamart.com',
  role: 'Executive Admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
};

export const CUSTOMER_TIER_OPTIONS = ['Standard', 'Silver', 'Gold', 'VIP'];
export const CUSTOMER_STATUS_OPTIONS = ['Active', 'Inactive', 'Suspended'];

const normalizeCustomerRecord = (customer = {}) => {
  const legacyTierValue = customer.accountTier || customer.tier || customer.loyaltyTier;
  const tier = CUSTOMER_TIER_OPTIONS.includes(legacyTierValue)
    ? legacyTierValue
    : (customer.status || '').toLowerCase().includes('vip')
      ? 'VIP'
      : (customer.status || '').toLowerCase().includes('gold')
        ? 'Gold'
        : (customer.status || '').toLowerCase().includes('silver')
          ? 'Silver'
          : 'Standard';

  const legacyStatusValue = customer.status;
  const status = CUSTOMER_STATUS_OPTIONS.includes(legacyStatusValue)
    ? legacyStatusValue
    : legacyStatusValue === 'Inactive' || legacyStatusValue === 'VIP Member'
      ? 'Active'
      : legacyStatusValue === 'Inactive'
        ? 'Inactive'
        : legacyStatusValue === 'Suspended'
          ? 'Suspended'
          : 'Active';

  return {
    ...customer,
    accountTier: tier,
    status,
    tier: undefined
  };
};

export function StoreProvider({ children }) {
  // Navigation & Modals State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subTab, setSubTab] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  // Entity Data State
  const [hasHydrated, setHasHydrated] = useState(false);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [banners, setBanners] = useState(INITIAL_BANNERS);
  const [coupons, setCoupons] = useState(INITIAL_COUPONS);
  const [settings, setSettings] = useState(STORE_SETTINGS);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  // Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCategoryManagementOpen, setIsCategoryManagementOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState(null);
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'New High Value Order',
      message: 'Tanvir Ahmed placed an order for Dhakai Jamdani Saree (৳11,250)',
      time: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      type: 'order',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Low Stock Alert',
      message: 'Brass Table Lamp has only 3 units remaining in warehouse.',
      time: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      type: 'inventory',
      read: false
    },
    {
      id: 'notif-3',
      title: 'Out of Stock Warning',
      message: 'Luxury Velvet Cushion Covers is completely out of stock!',
      time: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      type: 'alert',
      read: false
    },
    {
      id: 'notif-4',
      title: 'Coupon Milestone',
      message: 'Promo code EIDVIBES30 reached 140+ redemptions.',
      time: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
      type: 'marketing',
      read: true
    }
  ]);

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const savedCategories = safeGetItem('anonna_categories');
    const savedProducts = safeGetItem('anonna_products');
    const savedOrders = safeGetItem('anonna_orders');
    const savedCustomers = safeGetItem('anonna_customers');
    const savedVendors = safeGetItem('anonna_vendors');
    const savedBanners = safeGetItem('anonna_banners');
    const savedCoupons = safeGetItem('anonna_coupons');
    const savedSettings = safeGetItem('anonna_settings');
    const savedProfile = safeGetItem('anonna_profile');

    if (savedCategories) setCategories(JSON.parse(savedCategories));
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
    if (savedVendors) setVendors(JSON.parse(savedVendors));
    if (savedBanners) setBanners(JSON.parse(savedBanners));
    if (savedCoupons) setCoupons(JSON.parse(savedCoupons));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedProfile) setProfile(JSON.parse(savedProfile));
    setHasHydrated(true);
  }, []);

  const showToast = (title, message = '', type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync to LocalStorage
  useEffect(() => {
    if (!hasHydrated) return;
    safeSetItem('anonna_categories', JSON.stringify(categories));
  }, [categories, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    safeSetItem('anonna_products', JSON.stringify(products));
  }, [products, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    safeSetItem('anonna_orders', JSON.stringify(orders));
  }, [orders, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    safeSetItem('anonna_customers', JSON.stringify(customers));
  }, [customers, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    safeSetItem('anonna_banners', JSON.stringify(banners));
  }, [banners, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    safeSetItem('anonna_coupons', JSON.stringify(coupons));
  }, [coupons, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    safeSetItem('anonna_settings', JSON.stringify(settings));
  }, [settings, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    safeSetItem('anonna_profile', JSON.stringify(profile));
  }, [profile, hasHydrated]);

  const normalizeCategoryName = (value) => value.trim().replace(/\s+/g, ' ');

  const addCategory = (categoryName, description = '') => {
    const cleanName = normalizeCategoryName(categoryName || '');

    if (!cleanName) {
      return { success: false, message: 'Category name is required.' };
    }

    if (categories.some(cat => cat.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, message: 'Category already exists. Please choose a different name.' };
    }

    const newCategory = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      description: description?.trim() || '',
      normalizedName: cleanName.toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCategories(prev => [...prev, newCategory]);
    showToast('Category Created', `"${cleanName}" is now available in product settings.`);
    return { success: true, category: newCategory };
  };

  const updateCategory = (id, updates) => {
    const current = categories.find(cat => cat.id === id);
    if (!current) {
      return { success: false, message: 'Category not found.' };
    }

    const nextName = normalizeCategoryName(updates.name || current.name);
    if (nextName && categories.some(cat => cat.id !== id && cat.name.toLowerCase() === nextName.toLowerCase())) {
      return { success: false, message: 'Another category with this name already exists.' };
    }

    const nextCategory = {
      ...current,
      ...updates,
      name: nextName,
      normalizedName: nextName.toLowerCase(),
      updatedAt: new Date().toISOString()
    };

    setCategories(prev => prev.map(cat => cat.id === id ? nextCategory : cat));
    setProducts(prev => prev.map(product => product.category === current.name ? { ...product, category: nextName } : product));
    showToast('Category Updated', `"${nextName}" has been updated across the catalog.`);
    return { success: true, category: nextCategory };
  };

  const deleteCategory = (id, replacementCategoryName = null) => {
    const current = categories.find(cat => cat.id === id);
    if (!current) {
      return false;
    }

    const assignedProducts = products.filter(product => product.category === current.name);
    if (assignedProducts.length > 0 && !replacementCategoryName) {
      return false;
    }

    if (assignedProducts.length > 0 && replacementCategoryName) {
      setProducts(prev => prev.map(product => product.category === current.name ? { ...product, category: replacementCategoryName } : product));
    }

    setCategories(prev => prev.filter(cat => cat.id !== id));
    showToast('Category Removed', assignedProducts.length > 0
      ? `Moved ${assignedProducts.length} product${assignedProducts.length > 1 ? 's' : ''} to "${replacementCategoryName}" and removed the category.`
      : `"${current.name}" was deleted successfully.`
    );
    return true;
  };

  // Product Actions
  const addProduct = (newProd) => {
    const product = {
      ...newProd,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      salesCount: 0,
      rating: 5.0,
      reviewsCount: 0,
      status: Number(newProd.stock) <= 0 ? 'Out of Stock' : (Number(newProd.stock) <= Number(newProd.minStockAlert || 5) ? 'Low Stock' : 'In Stock')
    };
    setProducts(prev => [product, ...prev]);
    showToast('Product Created', `${product.name} has been added to catalog.`);
    return product;
  };

  const updateProduct = (id, updatedData) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const stockNum = updatedData.stock !== undefined ? Number(updatedData.stock) : p.stock;
        const minAlert = updatedData.minStockAlert !== undefined ? Number(updatedData.minStockAlert) : (p.minStockAlert || 5);
        const status = stockNum <= 0 ? 'Out of Stock' : (stockNum <= minAlert ? 'Low Stock' : 'In Stock');
        return { ...p, ...updatedData, stock: stockNum, status };
      }
      return p;
    }));
    showToast('Product Updated', 'Changes were saved successfully.');
  };

  const deleteProduct = (id) => {
    const prod = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast('Product Removed', `${prod?.name || 'Item'} was deleted from catalog.`, 'info');
  };

  const duplicateProduct = (id) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    const duplicated = {
      ...prod,
      id: `prod-${Date.now()}`,
      name: `${prod.name} (Copy)`,
      sku: `${prod.sku}-COPY`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProducts(prev => [duplicated, ...prev]);
    showToast('Product Duplicated', `Created a copy of ${prod.name}`);
  };

  // Order Actions
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return { ...order, orderStatus: newStatus };
      }
      return order;
    }));
    showToast('Order Status Updated', `Order ${orderId} is now marked as ${newStatus}.`);
  };

  const updateOrderPaymentStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return { ...order, paymentStatus: newStatus };
      }
      return order;
    }));
    showToast('Payment Status Updated', `Order ${orderId} payment is now ${newStatus}.`);
  };

  // Banner Actions
  const addBanner = (bannerData) => {
    const newBanner = {
      ...bannerData,
      id: `BAN-${Date.now().toString().slice(-4)}`,
      clicks: 0,
      impressions: 0,
      ctr: '0.00%',
      status: 'Active'
    };
    setBanners(prev => [newBanner, ...prev]);
    showToast('Banner Created', `"${newBanner.title}" is now active on store.`);
  };

  const updateBanner = (id, updatedData) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, ...updatedData } : b));
    showToast('Banner Updated', 'Banner details and graphics updated.');
  };

  const deleteBanner = (id) => {
    setBanners(prev => prev.filter(b => b.id !== id));
    showToast('Banner Deleted', 'Banner has been removed from storefront.', 'info');
  };

  const toggleBannerStatus = (id) => {
    setBanners(prev => prev.map(b => {
      if (b.id === id) {
        const nextStatus = b.status === 'Active' ? 'Paused' : 'Active';
        return { ...b, status: nextStatus };
      }
      return b;
    }));
    showToast('Status Changed', 'Banner display status updated.');
  };

  // Coupon Actions
  const addCoupon = (couponData) => {
    const newCoupon = {
      ...couponData,
      id: `CPN-${Date.now().toString().slice(-4)}`,
      totalUses: 0,
      status: 'Active'
    };
    setCoupons(prev => [newCoupon, ...prev]);
    showToast('Coupon Created', `Code "${newCoupon.code}" is ready to use!`);
  };

  const deleteCoupon = (id) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    showToast('Coupon Removed', 'Coupon code was removed.', 'info');
  };

  const toggleCouponStatus = (id) => {
    setCoupons(prev => prev.map(c => {
      if (c.id === id) {
        const next = c.status === 'Active' ? 'Disabled' : 'Active';
        return { ...c, status: next };
      }
      return c;
    }));
    showToast('Coupon Status Updated', 'Promo code state changed.');
  };

  // Notification Actions
  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('Notifications Cleared', 'All notifications marked as read.');
  };

  // Settings Actions
  const updateSettings = (newData) => {
    setSettings(prev => ({ ...prev, ...newData }));
    showToast('Settings Saved', 'Store configuration updated successfully.');
  };

  const updateProfile = (updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
    showToast('Profile Updated', 'Your account details were saved successfully.');
  };

  const updateCustomerProfile = (customerId, updates) => {
    const normalizedUpdates = {
      ...updates,
      status: updates.status || 'Active',
      accountTier: updates.accountTier || 'Standard'
    };

    const existed = customers.find(customer => customer.id === customerId);
    if (!existed) {
      return { success: false, message: 'Customer not found.' };
    }

    if (!CUSTOMER_TIER_OPTIONS.includes(normalizedUpdates.accountTier)) {
      return { success: false, message: 'Account Tier must be Standard, Silver, Gold, or VIP.' };
    }

    if (!CUSTOMER_STATUS_OPTIONS.includes(normalizedUpdates.status)) {
      return { success: false, message: 'Account Status must be Active, Inactive, or Suspended.' };
    }

    setCustomers(prev => prev.map(customer => customer.id === customerId
      ? { ...customer, ...normalizedUpdates }
      : customer));

    showToast('Customer Saved', `${existed.name}'s account details were updated successfully.`);
    return { success: true, customer: { ...existed, ...normalizedUpdates } };
  };

  const quickUpdateCustomerTier = (customerId, newTier) => {
    if (!CUSTOMER_TIER_OPTIONS.includes(newTier)) {
      return { success: false, message: 'Invalid account tier selected.' };
    }

    const customer = customers.find(item => item.id === customerId);
    if (!customer) {
      return { success: false, message: 'Customer not found.' };
    }

    setCustomers(prev => prev.map(item => item.id === customerId ? { ...item, accountTier: newTier } : item));
    showToast('Account Tier Updated', `${customer.name} is now ${newTier}.`);
    return { success: true, customer: { ...customer, accountTier: newTier } };
  };

  return (
    <StoreContext.Provider
      value={{
        activeTab,
        setActiveTab,
        subTab,
        setSubTab,
        isSearchOpen,
        setIsSearchOpen,
        globalSearchQuery,
        setGlobalSearchQuery,
        
        categories,
        addCategory,
        updateCategory,
        deleteCategory,

        products,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,

        orders,
        updateOrderStatus,
        updateOrderPaymentStatus,

        customers,
        setCustomers,
        updateCustomerProfile,
        quickUpdateCustomerTier,
        vendors,

        banners,
        addBanner,
        updateBanner,
        deleteBanner,
        toggleBannerStatus,

        coupons,
        addCoupon,
        deleteCoupon,
        toggleCouponStatus,

        settings,
        updateSettings,
        profile,
        updateProfile,

        // Modals & Drawers
        isAddProductOpen,
        setIsAddProductOpen,
        isCategoryManagementOpen,
        setIsCategoryManagementOpen,
        editingProduct,
        setEditingProduct,
        selectedOrderForDetail,
        setSelectedOrderForDetail,
        selectedOrderForInvoice,
        setSelectedOrderForInvoice,
        selectedCustomerForDetail,
        setSelectedCustomerForDetail,
        isAddBannerOpen,
        setIsAddBannerOpen,
        editingBanner,
        setEditingBanner,
        isAddCouponOpen,
        setIsAddCouponOpen,
        isProfileEditOpen,
        setIsProfileEditOpen,

        // Notifications & Toasts
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
