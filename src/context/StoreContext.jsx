import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_CUSTOMERS,
  INITIAL_VENDORS,
  INITIAL_BANNERS,
  INITIAL_COUPONS,
  STORE_SETTINGS
} from '../data/mockData';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  // Navigation & Modals State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subTab, setSubTab] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  // Entity Data State
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('anonna_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('anonna_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('anonna_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [vendors, setVendors] = useState(() => {
    const saved = localStorage.getItem('anonna_vendors');
    return saved ? JSON.parse(saved) : INITIAL_VENDORS;
  });

  const [banners, setBanners] = useState(() => {
    const saved = localStorage.getItem('anonna_banners');
    return saved ? JSON.parse(saved) : INITIAL_BANNERS;
  });

  const [coupons, setCoupons] = useState(() => {
    const saved = localStorage.getItem('anonna_coupons');
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('anonna_settings');
    return saved ? JSON.parse(saved) : STORE_SETTINGS;
  });

  // Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState(null);
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);

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
    localStorage.setItem('anonna_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('anonna_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('anonna_banners', JSON.stringify(banners));
  }, [banners]);

  useEffect(() => {
    localStorage.setItem('anonna_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('anonna_settings', JSON.stringify(settings));
  }, [settings]);

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
        
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,

        orders,
        updateOrderStatus,
        updateOrderPaymentStatus,

        customers,
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

        // Modals & Drawers
        isAddProductOpen,
        setIsAddProductOpen,
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
