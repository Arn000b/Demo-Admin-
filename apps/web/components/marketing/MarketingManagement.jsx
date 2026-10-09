import React, { useState } from 'react';
import {
  Megaphone,
  Tag,
  Plus,
  Sparkles,
  MousePointerClick,
  Eye,
  Percent,
  Copy,
  Check,
  Edit2,
  Trash2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  TrendingUp
} from 'lucide-react';
import { useStore } from '@/components/providers/StoreContext';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

export function MarketingManagement() {
  const {
    banners,
    coupons,
    setIsAddBannerOpen,
    setEditingBanner,
    deleteBanner,
    toggleBannerStatus,
    setIsAddCouponOpen,
    deleteCoupon,
    toggleCouponStatus,
    showToast
  } = useStore();

  const [activeTab, setActiveTab] = useState('banners'); // 'banners' | 'coupons'
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCoupon = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('Code Copied', `"${code}" copied to clipboard.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const totalBannerClicks = banners.reduce((sum, b) => sum + (b.clicks || 0), 0);
  const totalCouponUses = coupons.reduce((sum, c) => sum + (c.totalUses || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-950 font-display">
              Marketing & Promotions Center
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold-100 text-gold-900 border border-gold-300">
              Active Campaigns
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage homepage visual hero banners, seasonal sales (Up to 30% OFF), and customer discount codes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'banners' ? (
            <button
              onClick={() => {
                setEditingBanner(null);
                setIsAddBannerOpen(true);
              }}
              className="btn-gold py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New Banner</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddCouponOpen(true)}
              className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Generate Promo Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-brand-50 text-brand-900 border border-brand-200">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Banners</span>
            <h4 className="text-xl font-extrabold text-slate-900">
              {banners.filter(b => b.status === 'Active').length} Active Hero Slides
            </h4>
          </div>
        </div>

        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gold-50 text-gold-800 border border-gold-200">
            <MousePointerClick className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Campaign Clicks</span>
            <h4 className="text-xl font-extrabold text-slate-900">{totalBannerClicks.toLocaleString()} Total Clicks</h4>
          </div>
        </div>

        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Coupons Redeemed</span>
            <h4 className="text-xl font-extrabold text-slate-900">{totalCouponUses} Redemptions</h4>
          </div>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="card-premium p-3">
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'banners'
                ? 'bg-brand-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Storefront Promotional Banners ({banners.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'coupons'
                ? 'bg-brand-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Discount Coupons & Vouchers ({coupons.length})</span>
          </button>
        </div>
      </div>

      {/* BANNERS MANAGEMENT TAB */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="card-premium p-6 overflow-hidden border border-slate-200/80 hover:shadow-card-hover transition-all"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: Interactive Realistic Banner Preview */}
                  <div className="lg:col-span-8">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F3821] via-[#14462A] to-[#1A4D2E] text-white p-6 shadow-md border border-brand-700">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2 flex-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full bg-gold-400 text-brand-950 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-brand-950" />
                            {banner.badge}
                          </span>
                          <h3 className="text-xl sm:text-2xl font-extrabold font-display text-white leading-tight">
                            {banner.title}
                          </h3>
                          <p className="text-xs text-emerald-100/85 max-w-lg leading-relaxed">
                            {banner.subtitle}
                          </p>
                          <div className="pt-2 flex items-center gap-3">
                            <span className="btn-gold py-1.5 px-3.5 text-xs font-bold shadow-gold-glow pointer-events-none">
                              {banner.ctaText}
                            </span>
                            <span className="text-[11px] text-emerald-200/80 font-mono">
                              Target: {banner.ctaLink}
                            </span>
                          </div>
                        </div>

                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden ring-4 ring-gold-400/30 shadow-xl shrink-0">
                          <img
                            src={banner.image}
                            alt="Banner Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions */}
                  <div className="lg:col-span-4 flex flex-col justify-between space-y-4 lg:pl-4 lg:border-l lg:border-slate-100">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Placement</span>
                        <span className="text-xs font-bold text-brand-900 bg-brand-50 px-2 py-0.5 rounded-md">
                          {banner.position}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-center mb-4">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Impressions</span>
                          <p className="text-xs font-extrabold text-slate-900">{banner.impressions?.toLocaleString() || '12,400'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Clicks</span>
                          <p className="text-xs font-extrabold text-brand-950">{banner.clicks?.toLocaleString() || '820'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">CTR</span>
                          <p className="text-xs font-extrabold text-emerald-700">{banner.ctr || '6.6%'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Valid: {formatDate(banner.startDate)} → {formatDate(banner.endDate)}</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          banner.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {banner.status}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => toggleBannerStatus(banner.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                          banner.status === 'Active'
                            ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {banner.status === 'Active' ? 'Pause Campaign' : 'Activate Campaign'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingBanner(banner)}
                          className="p-2 text-slate-600 hover:text-brand-900 hover:bg-brand-50 rounded-xl transition-colors"
                          title="Edit Banner"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete banner "${banner.title}"?`)) {
                              deleteBanner(banner.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COUPONS MANAGEMENT TAB */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {coupons.map((coupon) => {
            const usagePercent = Math.min(100, Math.round(((coupon.totalUses || 0) / (coupon.maxUsageLimit || 100)) * 100));

            return (
              <div
                key={coupon.id}
                className="card-premium p-5 flex flex-col justify-between relative overflow-hidden group"
              >
                <div>
                  {/* Top Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-gold-50 text-gold-800 border border-gold-200">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Applicable To</span>
                        <p className="text-xs font-bold text-slate-800">{coupon.category || 'All Items'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleCouponStatus(coupon.id)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        coupon.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {coupon.status}
                    </button>
                  </div>

                  {/* Coupon Code Card */}
                  <div className="p-3.5 rounded-2xl bg-brand-950 text-white flex items-center justify-between border border-gold-400/30 my-3">
                    <div>
                      <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Promo Code</p>
                      <h4 className="text-lg font-mono font-black text-gold-300 tracking-wider">
                        {coupon.code}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleCopyCoupon(coupon.code)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Copy Code"
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gold-300" />
                      )}
                    </button>
                  </div>

                  {/* Discount Description */}
                  <div className="space-y-1.5 text-xs text-slate-600 my-3">
                    <p className="font-bold text-slate-900 text-sm">
                      {coupon.type === 'percentage' ? `${coupon.value}% Discount` : `${formatCurrency(coupon.value)} Flat OFF`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Min Order: <strong>{formatCurrency(coupon.minOrderValue)}</strong> • Max Disc: <strong>{formatCurrency(coupon.maxDiscount)}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Expires: <strong>{formatDate(coupon.expiryDate)}</strong>
                    </p>
                  </div>

                  {/* Usage Progress Bar */}
                  <div className="my-3 space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                      <span>Redeemed: {coupon.totalUses}</span>
                      <span>Limit: {coupon.maxUsageLimit}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-900 h-full rounded-full transition-all duration-500"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {usagePercent}% utilized
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete coupon "${coupon.code}"?`)) {
                        deleteCoupon(coupon.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Coupon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
