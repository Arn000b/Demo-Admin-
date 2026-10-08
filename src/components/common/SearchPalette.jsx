import React, { useState, useEffect } from 'react';
import { Search, Package, ShoppingBag, Users, Image as ImageIcon, Tag, ArrowRight, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../utils/formatters';

export function SearchPalette() {
  const {
    isSearchOpen,
    setIsSearchOpen,
    products,
    orders,
    customers,
    coupons,
    banners,
    setActiveTab,
    setSelectedOrderForDetail,
    setEditingProduct
  } = useStore();

  const [query, setQuery] = useState('');

  // Shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const trimmed = query.trim().toLowerCase();

  const filteredProducts = trimmed
    ? products.filter(p => p.name.toLowerCase().includes(trimmed) || p.sku.toLowerCase().includes(trimmed) || p.category.toLowerCase().includes(trimmed)).slice(0, 4)
    : [];

  const filteredOrders = trimmed
    ? orders.filter(o => o.id.toLowerCase().includes(trimmed) || o.customer.name.toLowerCase().includes(trimmed) || o.customer.phone.includes(trimmed)).slice(0, 4)
    : [];

  const filteredCustomers = trimmed
    ? customers.filter(c => c.name.toLowerCase().includes(trimmed) || c.email.toLowerCase().includes(trimmed) || c.phone.includes(trimmed)).slice(0, 3)
    : [];

  const filteredCoupons = trimmed
    ? coupons.filter(cpn => cpn.code.toLowerCase().includes(trimmed)).slice(0, 2)
    : [];

  const handleSelectProduct = (product) => {
    setIsSearchOpen(false);
    setActiveTab('products');
    setEditingProduct(product);
  };

  const handleSelectOrder = (order) => {
    setIsSearchOpen(false);
    setActiveTab('orders');
    setSelectedOrderForDetail(order);
  };

  const handleSelectCustomer = () => {
    setIsSearchOpen(false);
    setActiveTab('customers');
  };

  const handleQuickNav = (tab) => {
    setIsSearchOpen(false);
    setActiveTab(tab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsSearchOpen(false)}
      />

      {/* Palette Box */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-slide-down">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-brand-700 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, order ID, customers, promo codes, or navigation..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-base focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="ml-2 text-xs text-slate-400 bg-slate-200/80 px-2 py-1 rounded font-mono">ESC</span>
        </div>

        {/* Results Area */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {!query && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Quick Navigation</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Dashboard Overview', tab: 'dashboard', icon: Package },
                  { name: 'Product Catalog', tab: 'products', icon: Package },
                  { name: 'Orders Management', tab: 'orders', icon: ShoppingBag },
                  { name: 'Customers & Vendors', tab: 'customers', icon: Users },
                  { name: 'Marketing & Banners', tab: 'marketing', icon: ImageIcon },
                  { name: 'Coupons & Promos', tab: 'marketing', icon: Tag },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuickNav(item.tab)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-brand-50/80 border border-slate-100 text-left transition-colors group"
                    >
                      <div className="p-2 rounded-lg bg-brand-900/5 group-hover:bg-brand-900 text-brand-900 group-hover:text-gold-400 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-brand-900">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {query && (
            <>
              {filteredProducts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Products</p>
                  <div className="space-y-1">
                    {filteredProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800 line-clamp-1">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.sku} • {p.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-brand-900">{formatCurrency(p.price)}</span>
                          <span className="block text-[11px] text-slate-400">Stock: {p.stock}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredOrders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Orders</p>
                  <div className="space-y-1">
                    {filteredOrders.map(o => (
                      <div
                        key={o.id}
                        onClick={() => handleSelectOrder(o)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            ORD
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{o.id} • {o.customer.name}</p>
                            <p className="text-xs text-slate-400">{o.paymentMethod} • {o.customer.city}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-800">{formatCurrency(o.total)}</span>
                          <span className="block text-[11px] font-medium text-blue-600">{o.orderStatus}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredCustomers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Customers</p>
                  <div className="space-y-1">
                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={handleSelectCustomer}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-full object-cover" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.email} • {c.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredProducts.length === 0 && filteredOrders.length === 0 && filteredCustomers.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No results found for "{query}"</p>
                  <p className="text-xs text-slate-400 mt-1">Try searching by product name, SKU, order ID, or customer name</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
