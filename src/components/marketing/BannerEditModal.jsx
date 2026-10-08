import React, { useState, useEffect } from 'react';
import { X, Megaphone, Sparkles, Image as ImageIcon, Check, Calendar, Link as LinkIcon } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

const PRESET_BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
];

export function BannerEditModal() {
  const {
    isAddBannerOpen,
    setIsAddBannerOpen,
    editingBanner,
    setEditingBanner,
    addBanner,
    updateBanner
  } = useStore();

  const [formData, setFormData] = useState({
    title: 'Up to 30% OFF — Autumn Festive Extravaganza',
    subtitle: 'Exclusive discounts on Luxury Bed Sets, Silk Sarees & Organic Treats',
    badge: 'Limited Time Offer',
    ctaText: 'Shop Special Offers',
    ctaLink: '/collections/festive-specials',
    position: 'Homepage Hero Main',
    image: PRESET_BANNER_IMAGES[0],
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });

  useEffect(() => {
    if (editingBanner) {
      setFormData({
        title: editingBanner.title || '',
        subtitle: editingBanner.subtitle || '',
        badge: editingBanner.badge || 'Special Offer',
        ctaText: editingBanner.ctaText || 'Shop Now',
        ctaLink: editingBanner.ctaLink || '/collections/all',
        position: editingBanner.position || 'Homepage Hero Main',
        image: editingBanner.image || PRESET_BANNER_IMAGES[0],
        startDate: editingBanner.startDate || '',
        endDate: editingBanner.endDate || '',
      });
    } else {
      setFormData({
        title: 'Up to 30% OFF — New Festive Collection',
        subtitle: 'Experience royal handloom sarees and 400TC Egyptian cotton bedding',
        badge: 'Special Festive Offer',
        ctaText: 'Explore Collection',
        ctaLink: '/collections/festive',
        position: 'Homepage Hero Main',
        image: PRESET_BANNER_IMAGES[0],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '2026-11-30',
      });
    }
  }, [editingBanner, isAddBannerOpen]);

  if (!isAddBannerOpen && !editingBanner) return null;

  const handleClose = () => {
    setIsAddBannerOpen(false);
    setEditingBanner(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingBanner) {
      updateBanner(editingBanner.id, formData);
    } else {
      addBanner(formData);
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-6 animate-slide-down flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gold-400 text-brand-950">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingBanner ? 'Edit Promotional Banner' : 'Create Homepage Promotional Banner'}
              </h3>
              <p className="text-xs text-slate-500">
                Design captivating storefront marketing banners with high-converting CTAs
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Live Banner Preview Card (matching Anonna Mart luxury aesthetic) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Live Banner Rendering Preview
            </label>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F3821] via-[#14462A] to-[#1A4D2E] text-white p-6 shadow-xl border border-gold-400/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 flex-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-gold-400 text-brand-950 shadow-xs">
                    <Sparkles className="w-3 h-3 text-brand-950" />
                    {formData.badge || 'Special Promotion'}
                  </span>
                  <h4 className="text-xl sm:text-2xl font-extrabold font-display text-white leading-tight">
                    {formData.title || 'Up to 30% OFF Special Offer'}
                  </h4>
                  <p className="text-xs text-emerald-100/90 max-w-md leading-relaxed">
                    {formData.subtitle || 'Shop our highest quality artisanal products'}
                  </p>
                  <div className="pt-2">
                    <span className="btn-gold py-2 px-4 text-xs font-bold pointer-events-none inline-flex items-center gap-1.5 shadow-gold-glow">
                      {formData.ctaText || 'Shop Now'}
                    </span>
                  </div>
                </div>

                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden ring-4 ring-gold-400/40 shadow-2xl shrink-0">
                  <img
                    src={formData.image}
                    alt="Banner Promo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Main Banner Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Up to 30% OFF — Autumn Festive Collection"
                className="input-premium font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subheading / Promotional Text
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Brief value proposition or discount conditions"
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Badge / Tag Text
              </label>
              <input
                type="text"
                value={formData.badge}
                onChange={e => setFormData({ ...formData, badge: e.target.value })}
                placeholder="e.g., Up to 30% OFF, Flash Sale"
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Display Placement
              </label>
              <select
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="input-premium font-medium"
              >
                <option value="Homepage Hero Main">Homepage Hero Main</option>
                <option value="Category Banner Top">Category Banner Top</option>
                <option value="Homepage Middle Grid">Homepage Middle Grid</option>
                <option value="Cart Sidebar Banner">Cart Sidebar Banner</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Button CTA Label
              </label>
              <input
                type="text"
                value={formData.ctaText}
                onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
                placeholder="Shop Special Offers"
                className="input-premium font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Destination Link URL
              </label>
              <input
                type="text"
                value={formData.ctaLink}
                onChange={e => setFormData({ ...formData, ctaLink: e.target.value })}
                placeholder="/collections/festive-specials"
                className="input-premium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Image URL
              </label>
              <input
                type="text"
                value={formData.image}
                onChange={e => setFormData({ ...formData, image: e.target.value })}
                className="input-premium text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary py-2 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-gold py-2 px-6 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{editingBanner ? 'Update Banner' : 'Publish Banner'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
