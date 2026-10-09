import React from 'react';
import { X, Printer, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import { useStore } from '@/components/providers/StoreContext';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

export function InvoicePrintModal() {
  const { selectedOrderForInvoice, setSelectedOrderForInvoice, settings } = useStore();

  if (!selectedOrderForInvoice) return null;

  const order = selectedOrderForInvoice;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm"
        onClick={() => setSelectedOrderForInvoice(null)}
      />

      {/* Invoice Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-6 animate-slide-down flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Document</span>
            <span className="font-mono text-xs font-bold text-brand-900 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              {order.invoiceNumber || order.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-gold-400" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={() => setSelectedOrderForInvoice(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Page */}
        <div id="printable-invoice" className="p-8 sm:p-10 overflow-y-auto bg-white text-slate-800">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-8 border-b-2 border-brand-900 gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-900 p-2 flex items-center justify-center text-gold-400 font-serif font-black text-2xl shadow-md">
                  A
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold font-display text-brand-950 tracking-wide">
                    ANONNA<span className="text-gold-600">MART</span>
                  </h1>
                  <p className="text-xs font-medium text-slate-500">Premium Lifestyle & Artisanal Pantry</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500 leading-relaxed">
                <p>Anonna Mart HQ, Road 11, Banani, Dhaka 1213</p>
                <p>BIN/VAT Registration: #88392019-BIN</p>
                <p>Email: care@anonnamart.com | Hotline: +880 9612-889900</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <h2 className="text-xl font-extrabold text-brand-950 uppercase tracking-wider">
                COMMERCIAL INVOICE
              </h2>
              <div className="mt-2 space-y-1 text-xs">
                <p>
                  <span className="text-slate-400 font-medium">Invoice No:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{order.invoiceNumber || order.id}</span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Date:</span>{' '}
                  <span className="font-semibold text-slate-900">{formatDate(order.date, 'long')}</span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Payment Mode:</span>{' '}
                  <span className="font-bold text-brand-900">{order.paymentMethod}</span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Payment Status:</span>{' '}
                  <span className="inline-block font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {order.paymentStatus}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Billed To (Customer)
              </p>
              <h4 className="text-sm font-bold text-slate-900">{order.customer.name}</h4>
              <p className="text-xs text-slate-600 mt-0.5">{order.customer.phone}</p>
              <p className="text-xs text-slate-600">{order.customer.email}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Shipping Destination
              </p>
              <p className="text-xs font-semibold text-slate-800">{order.customer.address}</p>
              <p className="text-xs text-slate-600">{order.customer.city} — {order.customer.postalCode}</p>
              <p className="text-xs text-slate-500 mt-1 italic">
                {order.notes ? `Delivery Note: "${order.notes}"` : 'Standard Doorstep Delivery'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse my-6">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Item Description</th>
                <th className="py-2.5 px-2">SKU</th>
                <th className="py-2.5 px-2 text-right">Unit Price</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-2 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {order.items.map((item, index) => (
                <tr key={index} className="py-2">
                  <td className="py-3 px-2 text-slate-400 font-mono">{index + 1}</td>
                  <td className="py-3 px-2 font-semibold text-slate-900">{item.name}</td>
                  <td className="py-3 px-2 font-mono text-slate-500 text-[11px]">{item.sku}</td>
                  <td className="py-3 px-2 text-right text-slate-700">{formatCurrency(item.price)}</td>
                  <td className="py-3 px-2 text-center font-bold text-slate-900">{item.quantity}</td>
                  <td className="py-3 px-2 text-right font-bold text-slate-900">
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{formatCurrency(order.subtotal)}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Promo Discount ({order.couponCode || 'Coupon'})</span>
                  <span className="font-semibold">-{formatCurrency(order.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Standard Delivery Fee</span>
                <span className="font-semibold text-slate-900">{formatCurrency(order.shippingFee)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>VAT / Tax (Included)</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Math.round(order.total * 0.05))}</span>
              </div>

              <div className="flex justify-between pt-2 border-t-2 border-brand-900 text-base font-extrabold text-brand-950">
                <span>Grand Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
            <p className="font-semibold text-slate-600">Thank you for shopping with Anonna Mart!</p>
            <p className="mt-0.5">For support, questions, or returns, contact care@anonnamart.com within 7 days of delivery.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
