import React, { useState } from 'react';
import { X, Tag, Sparkles, Check, DollarSign, Percent } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function CreateCouponModal() {
  const { isAddCouponOpen, setIsAddCouponOpen, addCoupon } = useStore();

  const [formData, setFormData] = useState({
    code: 'AUTUMN25',
    type: 'percentage', // 'percentage' | 'fixed'
    value: 25,
    minOrderValue: 2500,
    maxDiscount: 1000,
    maxUsageLimit: 300,
    expiryDate: '2026-11-30',
    category: 'All Categories'
  });

  if (!isAddCouponOpen) return null;

  const handleGenerateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ANONNA';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addCoupon({
      ...formData,
      value: Number(formData.value) || 0,
      minOrderValue: Number(formData.minOrderValue) || 0,
      maxDiscount: Number(formData.maxDiscount) || 0,
      maxUsageLimit: Number(formData.maxUsageLimit) || 100,
    });
    setIsAddCouponOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm"
        onClick={() => setIsAddCouponOpen(false)}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-slide-down">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-900 text-gold-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Discount Coupon</h3>
              <p className="text-xs text-slate-500">Generate special promotional vouchers & codes</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddCouponOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Coupon Promo Code *
              </label>
              <button
                type="button"
                onClick={handleGenerateRandomCode}
                className="text-xs font-semibold text-brand-800 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-gold-600" />
                Randomize
              </button>
            </div>
            <input
              type="text"
              required
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="input-premium font-mono font-extrabold tracking-wider uppercase text-base text-brand-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Discount Type
              </label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="input-premium font-semibold"
              >
                <option value="percentage">Percentage (% OFF)</option>
                <option value="fixed">Fixed Amount (৳ OFF)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Discount Value *
              </label>
              <input
                type="number"
                required
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                placeholder={formData.type === 'percentage' ? '25%' : '৳500'}
                className="input-premium font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Minimum Spend (৳)
              </label>
              <input
                type="number"
                value={formData.minOrderValue}
                onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })}
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Max Discount Cap (৳)
              </label>
              <input
                type="number"
                value={formData.maxDiscount}
                onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                className="input-premium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usage Limit
              </label>
              <input
                type="number"
                value={formData.maxUsageLimit}
                onChange={e => setFormData({ ...formData, maxUsageLimit: e.target.value })}
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                className="input-premium"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddCouponOpen(false)}
              className="btn-secondary py-2 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-6 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Create Coupon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
