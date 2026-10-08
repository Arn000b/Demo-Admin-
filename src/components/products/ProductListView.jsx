import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Copy,
  Star,
  Layers,
  LayoutGrid,
  List,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Package
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { StockBadge, CategoryBadge } from '../common/Badge';
import { formatCurrency } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportHelpers';

const CATEGORIES = ['All', 'Bed Sheets', "Women's Fashion", 'Organic Food', 'Home Decor'];

export function ProductListView() {
  const {
    products,
    setIsAddProductOpen,
    setEditingProduct,
    deleteProduct,
    duplicateProduct,
    showToast
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStockStatus, setSelectedStockStatus] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter Logic
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    
    const matchesStock =
      selectedStockStatus === 'All' ||
      (selectedStockStatus === 'In Stock' && product.status === 'In Stock') ||
      (selectedStockStatus === 'Low Stock' && product.status === 'Low Stock') ||
      (selectedStockStatus === 'Out of Stock' && product.status === 'Out of Stock');

    return matchesSearch && matchesCategory && matchesStock;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'sales') return (b.salesCount || 0) - (a.salesCount || 0);
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const handleExportCSV = () => {
    const rows = filteredProducts.map(p => ({
      ID: p.id,
      Name: p.name,
      Category: p.category,
      SKU: p.sku,
      Price: p.price,
      OriginalPrice: p.originalPrice || p.price,
      CostPrice: p.costPrice || 0,
      Stock: p.stock,
      Status: p.status,
      SalesCount: p.salesCount || 0,
      Rating: p.rating
    }));
    exportToCSV('Anonna_Mart_Products_Catalog', rows);
    showToast('Catalog Exported', 'Product catalog CSV file generated.');
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)) {
      selectedIds.forEach(id => deleteProduct(id));
      setSelectedIds([]);
    }
  };

  const inStockCount = products.filter(p => p.status === 'In Stock').length;
  const lowStockCount = products.filter(p => p.status === 'Low Stock').length;
  const outOfStockCount = products.filter(p => p.status === 'Out of Stock').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-950 font-display">
              Product Catalog
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900">
              {products.length} Items Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage inventory levels, discounts, descriptions, and lifestyle imagery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="btn-secondary py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsAddProductOpen(true);
            }}
            className="btn-gold py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Stock Status Quick Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedStockStatus('All')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedStockStatus === 'All' ? 'bg-brand-900 text-white border-brand-900 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className={`text-[11px] font-semibold uppercase ${selectedStockStatus === 'All' ? 'text-emerald-200' : 'text-slate-400'}`}>
            Total Products
          </p>
          <h4 className="text-xl font-extrabold mt-0.5">{products.length}</h4>
        </div>

        <div
          onClick={() => setSelectedStockStatus('In Stock')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedStockStatus === 'In Stock' ? 'bg-emerald-800 text-white border-emerald-800 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className={`text-[11px] font-semibold uppercase ${selectedStockStatus === 'In Stock' ? 'text-emerald-200' : 'text-slate-400'}`}>
            In Stock
          </p>
          <h4 className={`text-xl font-extrabold mt-0.5 ${selectedStockStatus === 'In Stock' ? 'text-white' : 'text-emerald-700'}`}>
            {inStockCount}
          </h4>
        </div>

        <div
          onClick={() => setSelectedStockStatus('Low Stock')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedStockStatus === 'Low Stock' ? 'bg-amber-700 text-white border-amber-700 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className={`text-[11px] font-semibold uppercase ${selectedStockStatus === 'Low Stock' ? 'text-amber-200' : 'text-slate-400'}`}>
            Low Stock Alerts
          </p>
          <h4 className={`text-xl font-extrabold mt-0.5 ${selectedStockStatus === 'Low Stock' ? 'text-white' : 'text-amber-600'}`}>
            {lowStockCount}
          </h4>
        </div>

        <div
          onClick={() => setSelectedStockStatus('Out of Stock')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedStockStatus === 'Out of Stock' ? 'bg-rose-800 text-white border-rose-800 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className={`text-[11px] font-semibold uppercase ${selectedStockStatus === 'Out of Stock' ? 'text-rose-200' : 'text-slate-400'}`}>
            Out of Stock
          </p>
          <h4 className={`text-xl font-extrabold mt-0.5 ${selectedStockStatus === 'Out of Stock' ? 'text-white' : 'text-rose-600'}`}>
            {outOfStockCount}
          </h4>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="card-premium p-4 sm:p-5 space-y-4">
        {/* Top filter row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by product, SKU, tag..."
              className="input-premium pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Sort By Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="featured">Featured First</option>
                <option value="sales">Best Selling</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 mr-1 uppercase">Category:</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Strip if items selected */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-brand-900 text-white rounded-2xl flex items-center justify-between shadow-lg animate-slide-down">
          <div className="flex items-center gap-2.5 text-xs font-semibold pl-2">
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse"></span>
            <span>{selectedIds.length} products selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Table / Grid Products Presentation */}
      {filteredProducts.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No products matched your criteria</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, selected category filter, or stock status.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={handleSelectAll}
                      className="rounded text-brand-900 focus:ring-brand-700 border-slate-300"
                    />
                  </th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Sales</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map(prod => (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(prod.id)}
                        onChange={() => handleToggleSelect(prod.id)}
                        className="rounded text-brand-900 focus:ring-brand-700 border-slate-300"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <p 
                            className="font-bold text-slate-900 hover:text-brand-900 transition-colors cursor-pointer line-clamp-1" 
                            onClick={() => setEditingProduct(prod)}
                          >
                            {prod.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {prod.sku}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <CategoryBadge category={prod.category} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-extrabold text-brand-950 text-sm block">
                          {formatCurrency(prod.price)}
                        </span>
                        {prod.originalPrice && prod.originalPrice > prod.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {formatCurrency(prod.originalPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StockBadge status={prod.status} stock={prod.stock} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 text-xs">{prod.salesCount || 0} sold</span>
                        <div className="flex items-center text-amber-500 font-bold text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                          <span>{prod.rating}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => setEditingProduct(prod)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-900 hover:bg-brand-50 transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateProduct(prod.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Duplicate Product"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${prod.name}?`)) {
                              deleteProduct(prod.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map(prod => (
            <div
              key={prod.id}
              className="card-premium overflow-hidden group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <StockBadge status={prod.status} stock={prod.stock} />
                  </div>
                  {prod.originalPrice && prod.originalPrice > prod.price && (
                    <span className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      {Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)}% OFF
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{prod.category}</span>
                    <span className="font-mono text-[10px] text-slate-400">{prod.sku}</span>
                  </div>
                  <h4
                    onClick={() => setEditingProduct(prod)}
                    className="text-sm font-bold text-slate-900 group-hover:text-brand-900 line-clamp-1 cursor-pointer transition-colors"
                  >
                    {prod.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-base font-extrabold text-brand-950">
                    {formatCurrency(prod.price)}
                  </span>
                  {prod.originalPrice && prod.originalPrice > prod.price && (
                    <span className="text-xs text-slate-400 line-through ml-1.5">
                      {formatCurrency(prod.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingProduct(prod)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-brand-900 hover:bg-slate-100 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicateProduct(prod.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${prod.name}?`)) {
                        deleteProduct(prod.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
