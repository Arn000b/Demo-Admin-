import React, { useState } from 'react';
import {
  Store,
  CreditCard,
  Truck,
  Shield,
  Bell,
  Check,
  Building,
  Mail,
  Phone,
  Save,
  Sparkles
} from 'lucide-react';
import { useStore } from '@/components/providers/StoreContext';

export function StoreSettingsView() {
  const { settings, updateSettings, showToast } = useStore();

  const [formData, setFormData] = useState({
    storeName: settings.storeName || 'Anonna Mart',
    tagline: settings.tagline || 'Premium Lifestyle & Organic Living',
    currency: settings.currency || 'BDT (৳)',
    currencySymbol: settings.currencySymbol || '৳',
    supportEmail: settings.supportEmail || 'care@anonnamart.com',
    supportPhone: settings.supportPhone || '+880 9612-889900',
    address: settings.address || 'Anonna Mart HQ, Road 11, Banani, Dhaka 1213, Bangladesh',
    vatPercent: settings.vatPercent || 5,
    defaultDeliveryFeeDhaka: settings.defaultDeliveryFeeDhaka || 80,
    defaultDeliveryFeeOutside: settings.defaultDeliveryFeeOutside || 150,
    freeShippingThreshold: settings.freeShippingThreshold || 5000,
    bkash: true,
    nagad: true,
    sslcommerz: true,
    cod: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
    showToast('Settings Updated', 'Store configuration successfully saved to system.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-950 font-display">
              Store Settings & Configuration
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900">
              Control Center
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure store branding, payment gateway API credentials, regional shipping fees, and tax rules.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="btn-gold py-2.5 px-5 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Profile Card */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-brand-900 text-gold-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Store Profile & Branding</h3>
              <p className="text-xs text-slate-500">Legal entity details shown on invoices and customer emails</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Brand Store Name *
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                className="input-premium font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tagline / Motto
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer Support Email
              </label>
              <input
                type="email"
                value={formData.supportEmail}
                onChange={e => setFormData({ ...formData, supportEmail: e.target.value })}
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer Care Hotline
              </label>
              <input
                type="text"
                value={formData.supportPhone}
                onChange={e => setFormData({ ...formData, supportPhone: e.target.value })}
                className="input-premium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Headquarters Business Address (For Invoices)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="input-premium"
              />
            </div>
          </div>
        </div>

        {/* Shipping & Delivery Charges */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Regional Delivery & Shipping Rules</h3>
              <p className="text-xs text-slate-500">Automated courier rates applied during checkout</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Inside Dhaka Metro (৳)
              </label>
              <input
                type="number"
                value={formData.defaultDeliveryFeeDhaka}
                onChange={e => setFormData({ ...formData, defaultDeliveryFeeDhaka: Number(e.target.value) })}
                className="input-premium font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Outside Dhaka / Nationwide (৳)
              </label>
              <input
                type="number"
                value={formData.defaultDeliveryFeeOutside}
                onChange={e => setFormData({ ...formData, defaultDeliveryFeeOutside: Number(e.target.value) })}
                className="input-premium font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Free Shipping Threshold (৳)
              </label>
              <input
                type="number"
                value={formData.freeShippingThreshold}
                onChange={e => setFormData({ ...formData, freeShippingThreshold: Number(e.target.value) })}
                className="input-premium font-bold text-brand-900"
              />
            </div>
          </div>
        </div>

        {/* Payment Gateway Integrations */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-gold-100 text-gold-900">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Payment Gateway Integrations</h3>
              <p className="text-xs text-slate-500">Enable or disable customer checkout channels</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'bkash', name: 'bKash Online Merchant Gateway', desc: 'Instant OTP checkout (0% merchant charge promotion)', active: formData.bkash },
              { id: 'nagad', name: 'Nagad Digital Wallet', desc: 'Direct mobile wallet payment integration', active: formData.nagad },
              { id: 'sslcommerz', name: 'SSLCommerz (Visa / Mastercard / Amex)', desc: 'Secure 3D-secure card payment processor', active: formData.sslcommerz },
              { id: 'cod', name: 'Cash on Delivery (COD)', desc: 'Doorstep cash payment with verification PIN', active: formData.cod }
            ].map(gateway => (
              <div key={gateway.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">{gateway.name}</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">{gateway.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={gateway.active}
                  onChange={e => setFormData({ ...formData, [gateway.id]: e.target.checked })}
                  className="w-5 h-5 text-brand-900 rounded focus:ring-brand-700 border-slate-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="btn-gold py-3 px-8 text-xs font-bold flex items-center gap-2 shadow-gold-glow"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Store Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
