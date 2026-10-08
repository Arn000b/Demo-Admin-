import React, { useState } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Phone,
  Mail,
  User,
  ShoppingBag,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatusBadge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'];

export function OrderDetailModal() {
  const {
    selectedOrderForDetail,
    setSelectedOrderForDetail,
    setSelectedOrderForInvoice,
    updateOrderStatus
  } = useStore();

  if (!selectedOrderForDetail) return null;

  const order = selectedOrderForDetail;

  const currentStepIndex = STATUS_STEPS.indexOf(order.orderStatus);

  const handleStatusChange = (newStatus) => {
    updateOrderStatus(order.id, newStatus);
    setSelectedOrderForDetail(prev => ({ ...prev, orderStatus: newStatus }));
  };

  const handleOpenInvoice = () => {
    const current = order;
    setSelectedOrderForDetail(null);
    setSelectedOrderForInvoice(current);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm"
        onClick={() => setSelectedOrderForDetail(null)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-6 animate-slide-down flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-900 text-gold-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Order Details — {order.id}
                </h3>
                <OrderStatusBadge status={order.orderStatus} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Placed on {formatDate(order.date, 'time')} • Invoice #{order.invoiceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInvoice}
              className="btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Invoice</span>
            </button>
            <button
              onClick={() => setSelectedOrderForDetail(null)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Order Status Timeline Stepper */}
          <div className="p-5 rounded-2xl bg-brand-50/50 border border-brand-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase text-brand-950 tracking-wider">
                Fulfillment Stepper Timeline
              </h4>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-500">Update State:</span>
                <select
                  value={order.orderStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Stepper progress bar */}
            <div className="relative flex items-center justify-between pt-2">
              <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-200 z-0">
                <div
                  className="h-full bg-brand-900 transition-all duration-500"
                  style={{
                    width:
                      currentStepIndex >= 0
                        ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`
                        : '0%'
                  }}
                />
              </div>

              {STATUS_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-brand-900 text-gold-400 ring-4 ring-gold-400/30'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] font-semibold mt-1.5 whitespace-nowrap ${
                        isCurrent ? 'text-brand-950 font-bold' : isPassed ? 'text-brand-900' : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer & Address Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={order.customer.avatar}
                  alt={order.customer.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-brand-900/10"
                />
                <div>
                  <h5 className="text-sm font-bold text-slate-900">{order.customer.name}</h5>
                  <p className="text-xs text-slate-500">Verified Customer</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{order.customer.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{order.customer.email}</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-brand-900 font-bold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-brand-700" />
                <span>Shipping Address</span>
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <p className="font-semibold">{order.customer.address}</p>
                <p className="text-slate-500">{order.customer.city}, Bangladesh ({order.customer.postalCode})</p>
                {order.notes && (
                  <p className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] mt-2">
                    <strong>Customer Note:</strong> {order.notes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ordered Items List */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
              Purchased Items ({order.items.length})
            </h4>
            <div className="divide-y divide-slate-100">
              {order.items.map((item, index) => (
                <div key={index} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{item.sku}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatCurrency(item.price)} × {item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({order.couponCode})</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping Delivery Fee</span>
                <span>{formatCurrency(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-brand-950">
                <span>Grand Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Payment:</span>
            <span className="font-bold text-brand-900">{order.paymentMethod}</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[10px]">
              {order.paymentStatus}
            </span>
          </div>

          <button
            onClick={handleOpenInvoice}
            className="btn-gold py-2 px-4 text-xs font-bold flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Commercial Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}
