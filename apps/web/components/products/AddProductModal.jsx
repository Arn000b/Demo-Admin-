import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Sparkles,
  Check,
  Percent,
  Tag,
  Layers,
  DollarSign,
  Package,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { useStore } from '@/components/providers/StoreContext';
import { formatCurrency } from '@/lib/utils/formatters';

const PRESET_IMAGES = [
  { label: 'Bed Sheet Set', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80' },
  { label: 'Silk Saree', url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Pure Honey', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80' },
  { label: 'Brass Lamp', url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Deshi Ghee', url: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=600&q=80' },
  { label: 'Mamra Almonds', url: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=600&q=80' },
];

export function AddProductModal() {
  const {
    categories,
    isAddProductOpen,
    setIsAddProductOpen,
    setIsCategoryManagementOpen,
    editingProduct,
    setEditingProduct,
    addProduct,
    updateProduct
  } = useStore();

  const [activeStep, setActiveStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});
  const categoryOptions = categories.length ? categories.map(category => category.name) : ['Bed Sheets'];
  const [formData, setFormData] = useState({
    name: '',
    category: 'Bed Sheets',
    sku: '',
    price: '',
    originalPrice: '',
    costPrice: '',
    stock: '25',
    minStockAlert: '5',
    description: '',
    image: PRESET_IMAGES[0].url,
    weight: '1.2 kg',
    dimensions: 'Standard',
    tags: 'Luxury, Best Seller',
    featured: true,
    discountActive: true
  });

  useEffect(() => {
    const fallbackCategory = categories[0]?.name || 'Bed Sheets';

    if (editingProduct) {
      const nextCategory = categories.some(cat => cat.name === editingProduct.category) ? editingProduct.category : fallbackCategory;
      setFormData({
        name: editingProduct.name || '',
        category: nextCategory,
        sku: editingProduct.sku || '',
        price: editingProduct.price || '',
        originalPrice: editingProduct.originalPrice || editingProduct.price || '',
        costPrice: editingProduct.costPrice || '',
        stock: editingProduct.stock?.toString() || '0',
        minStockAlert: editingProduct.minStockAlert?.toString() || '5',
        description: editingProduct.description || '',
        image: editingProduct.image || PRESET_IMAGES[0].url,
        weight: editingProduct.weight || '1.0 kg',
        dimensions: editingProduct.dimensions || 'Standard',
        tags: editingProduct.tags ? editingProduct.tags.join(', ') : '',
        featured: !!editingProduct.featured,
        discountActive: !!editingProduct.discountActive
      });
      setActiveStep(1);
    } else {
      setFormData({
        name: '',
        category: fallbackCategory,
        sku: `ANONNA-${Math.floor(1000 + Math.random() * 9000)}`,
        price: '3200',
        originalPrice: '3800',
        costPrice: '1900',
        stock: '30',
        minStockAlert: '8',
        description: 'Premium quality authentic artisanal item tailored for discerning lifestyle aesthetics.',
        image: PRESET_IMAGES[0].url,
        weight: '1.2 kg',
        dimensions: 'Standard',
        tags: 'New Arrival, Organic, Premium',
        featured: true,
        discountActive: true
      });
      setActiveStep(1);
    }
  }, [editingProduct, isAddProductOpen, categories]);

  if (!isAddProductOpen && !editingProduct) return null;

  const handleClose = () => {
    setIsAddProductOpen(false);
    setEditingProduct(null);
  };

  const handleGenerateSKU = () => {
    const prefix = formData.category.slice(0, 3).toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    setFormData(prev => ({ ...prev, sku: `${prefix}-${random}-LUX` }));
  };

  const calculateDiscountPercent = () => {
    const orig = Number(formData.originalPrice);
    const curr = Number(formData.price);
    if (orig && curr && orig > curr) {
      return Math.round(((orig - curr) / orig) * 100);
    }
    return 0;
  };

  const calculateMargin = () => {
    const selling = Number(formData.price);
    const cost = Number(formData.costPrice);
    if (selling && cost && selling > cost) {
      return Math.round(((selling - cost) / selling) * 100);
    }
    return 0;
  };

  const validateStep = (step) => {
    const nextErrors = {};

    if (step === 1) {
      if (!formData.name?.trim()) nextErrors.name = 'Product name is required.';
      if (!formData.category?.trim()) nextErrors.category = 'Category is required.';
      if (!formData.tags?.trim()) nextErrors.tags = 'Add at least one tag.';
    }

    if (step === 2) {
      if (!formData.price || Number(formData.price) <= 0) nextErrors.price = 'Selling price must be greater than 0.';
      if (!formData.originalPrice || Number(formData.originalPrice) <= 0) nextErrors.originalPrice = 'Original price is required.';
      if (!formData.costPrice || Number(formData.costPrice) <= 0) nextErrors.costPrice = 'Cost price is required.';
    }

    if (step === 3) {
      if (!formData.sku?.trim()) nextErrors.sku = 'SKU is required.';
      if (!formData.stock || Number(formData.stock) < 0) nextErrors.stock = 'Stock count must be 0 or more.';
    }

    if (step === 4 && !formData.image?.trim()) nextErrors.image = 'Choose a product image.';

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToStep = (step) => {
    if (step <= activeStep || validateStep(activeStep)) {
      setActiveStep(step);
      setValidationErrors({});
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const stepValidation = [1, 2, 3, 4].every(validateStep);
    if (!stepValidation) {
      setActiveStep(1);
      return;
    }

    const tagArray = typeof formData.tags === 'string'
      ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      : formData.tags;

    const payload = {
      ...formData,
      price: Number(formData.price) || 0,
      originalPrice: Number(formData.originalPrice) || Number(formData.price) || 0,
      costPrice: Number(formData.costPrice) || 0,
      stock: Number(formData.stock) || 0,
      minStockAlert: Number(formData.minStockAlert) || 5,
      tags: tagArray,
      discountPercent: calculateDiscountPercent()
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, payload);
    } else {
      addProduct(payload);
    }

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-6 animate-slide-down flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-900 text-gold-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Edit Catalog Product' : 'Add New Product to Catalog'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure pricing, imagery, inventory counts, and SEO metadata
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step progress tabs */}
        <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold">
          {[
            { step: 1, label: '1. Basic Info & Category' },
            { step: 2, label: '2. Pricing & Profit Margin' },
            { step: 3, label: '3. Inventory & Specs' },
            { step: 4, label: '4. Imagery & Preview' },
          ].map(s => (
            <button
              key={s.step}
              type="button"
              onClick={() => goToStep(s.step)}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all ${
                activeStep === s.step
                  ? 'bg-brand-900 text-white shadow-xs'
                  : activeStep > s.step
                  ? 'text-brand-900 font-bold hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {activeStep > s.step && <Check className="w-3.5 h-3.5 text-gold-400" />}
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Basic Info */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g., Luxury Egyptian Cotton 400TC King Bed Sheet Set"
                  className={`input-premium font-medium ${validationErrors.name ? 'border-rose-300 focus:border-rose-500' : ''}`}
                />
                {validationErrors.name && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.category}
                      onChange={e => {
                        setFormData({ ...formData, category: e.target.value });
                        if (validationErrors.category) setValidationErrors(prev => ({ ...prev, category: '' }));
                      }}
                      className={`input-premium font-medium flex-1 ${validationErrors.category ? 'border-rose-300 focus:border-rose-500' : ''}`}
                    >
                      {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  {validationErrors.category && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.category}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Search Tags & Badges
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={e => {
                      setFormData({ ...formData, tags: e.target.value });
                      if (validationErrors.tags) setValidationErrors(prev => ({ ...prev, tags: '' }));
                    }}
                    placeholder="e.g. Best Seller, Pure Honey, Handloom (comma separated)"
                    className={`input-premium ${validationErrors.tags ? 'border-rose-300 focus:border-rose-500' : ''}`}
                  />
                  {validationErrors.tags && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.tags}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detailed Product Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Highlight key materials, weaves, origin, authenticity certification, and care instructions..."
                  className="input-premium resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-brand-50/70 border border-brand-100">
                <input
                  type="checkbox"
                  id="featuredToggle"
                  checked={formData.featured}
                  onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-brand-900 rounded focus:ring-brand-700 border-slate-300"
                />
                <label htmlFor="featuredToggle" className="text-xs font-semibold text-brand-950 cursor-pointer">
                  Feature this product on homepage showcases and promotional carousels
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: Pricing & Margin */}
          {activeStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Original / Retail Price (৳)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      required
                      value={formData.originalPrice}
                      onChange={e => {
                        setFormData({ ...formData, originalPrice: e.target.value });
                        if (validationErrors.originalPrice) setValidationErrors(prev => ({ ...prev, originalPrice: '' }));
                      }}
                      placeholder="4500"
                      className={`input-premium pl-8 font-semibold ${validationErrors.originalPrice ? 'border-rose-300 focus:border-rose-500' : ''}`}
                    />
                  </div>
                  {validationErrors.originalPrice && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.originalPrice}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Selling / Offer Price (৳) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-brand-900 font-bold">৳</span>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={e => {
                        setFormData({ ...formData, price: e.target.value });
                        if (validationErrors.price) setValidationErrors(prev => ({ ...prev, price: '' }));
                      }}
                      placeholder="3850"
                      className={`input-premium pl-8 font-bold text-brand-900 ${validationErrors.price ? 'border-rose-300 focus:border-rose-500' : ''}`}
                    />
                  </div>
                  {validationErrors.price && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.price}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cost Price (৳)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      value={formData.costPrice}
                      onChange={e => {
                        setFormData({ ...formData, costPrice: e.target.value });
                        if (validationErrors.costPrice) setValidationErrors(prev => ({ ...prev, costPrice: '' }));
                      }}
                      placeholder="2200"
                      className={`input-premium pl-8 ${validationErrors.costPrice ? 'border-rose-300 focus:border-rose-500' : ''}`}
                    />
                  </div>
                  {validationErrors.costPrice && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.costPrice}</p>}
                </div>
              </div>

              {/* Live Profit Margin & Discount Indicator Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-900 to-brand-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div>
                  <p className="text-xs font-semibold text-gold-400">Commercial Margin Analytics</p>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    Profit Margin: <span className="text-emerald-300 font-extrabold text-base">{calculateMargin()}%</span> per unit
                  </h4>
                  <p className="text-[11px] text-emerald-100/80">
                    Gross estimated profit: {formatCurrency(Number(formData.price) - Number(formData.costPrice || 0))}
                  </p>
                </div>

                {calculateDiscountPercent() > 0 && (
                  <div className="text-right bg-brand-950/60 px-4 py-2 rounded-xl border border-gold-400/30">
                    <span className="text-[10px] text-slate-300 block uppercase font-bold">Storefront Badge</span>
                    <span className="text-sm font-extrabold text-gold-300">
                      {calculateDiscountPercent()}% OFF
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Inventory & Specs */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      SKU Code *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSKU}
                      className="text-[11px] font-semibold text-brand-800 hover:text-brand-950 flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3 text-gold-600" />
                      Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={e => {
                      setFormData({ ...formData, sku: e.target.value });
                      if (validationErrors.sku) setValidationErrors(prev => ({ ...prev, sku: '' }));
                    }}
                    placeholder="BED-EGY-400-K"
                    className={`input-premium font-mono font-bold ${validationErrors.sku ? 'border-rose-300 focus:border-rose-500' : ''}`}
                  />
                  {validationErrors.sku && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.sku}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Initial Stock Count *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={e => {
                      setFormData({ ...formData, stock: e.target.value });
                      if (validationErrors.stock) setValidationErrors(prev => ({ ...prev, stock: '' }));
                    }}
                    placeholder="25"
                    className={`input-premium font-semibold ${validationErrors.stock ? 'border-rose-300 focus:border-rose-500' : ''}`}
                  />
                  {validationErrors.stock && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.stock}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Low Stock Alert Limit
                  </label>
                  <input
                    type="number"
                    value={formData.minStockAlert}
                    onChange={e => setFormData({ ...formData, minStockAlert: e.target.value })}
                    placeholder="5"
                    className="input-premium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Item Weight
                  </label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="1.5 kg / 500g"
                    className="input-premium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Dimensions / Size
                  </label>
                  <input
                    type="text"
                    value={formData.dimensions}
                    onChange={e => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="King (78x80) / Free Size"
                    className="input-premium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Imagery & Live Preview */}
          {activeStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Image URL or Sample Presets
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.image}
                    onChange={e => {
                      setFormData({ ...formData, image: e.target.value });
                      if (validationErrors.image) setValidationErrors(prev => ({ ...prev, image: '' }));
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className={`input-premium ${validationErrors.image ? 'border-rose-300 focus:border-rose-500' : ''}`}
                  />
                </div>
                {validationErrors.image && <p className="mt-1 text-[11px] font-medium text-rose-600">{validationErrors.image}</p>}
              </div>

              {/* Sample Preset Thumbnails */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Or select from curated lifestyle presets:</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_IMAGES.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setFormData({ ...formData, image: img.url })}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                        formData.image === img.url ? 'border-brand-900 ring-2 ring-gold-400' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-16 object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white font-bold text-center px-1">{img.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Storefront Live Card Preview
                </p>
                <div className="max-w-xs bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
                  <div className="relative h-44 bg-slate-100">
                    <img
                      src={formData.image || PRESET_IMAGES[0].url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {calculateDiscountPercent() > 0 && (
                      <span className="absolute top-2 left-2 bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
                        -{calculateDiscountPercent()}% OFF
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 bg-brand-950/80 text-gold-300 text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {formData.category}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <h5 className="text-xs font-bold text-slate-900 line-clamp-1">
                      {formData.name || 'Untitled Product'}
                    </h5>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-sm font-extrabold text-brand-900">
                        {formatCurrency(formData.price || 0)}
                      </span>
                      {Number(formData.originalPrice) > Number(formData.price) && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(formData.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={() => {
                setValidationErrors({});
                setActiveStep(prev => prev - 1);
              }}
              className="btn-secondary py-2 px-4 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous Step
            </button>

            <div className="flex items-center gap-2.5">
              {activeStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep(activeStep)) setActiveStep(prev => prev + 1);
                  }}
                  className="btn-primary py-2 px-5 text-xs font-semibold"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-gold py-2 px-6 text-xs font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingProduct ? 'Save Product Changes' : 'Publish Product to Store'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
