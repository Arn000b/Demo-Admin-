import React from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Percent,
  Download,
  Calendar
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportHelpers';

export function DetailedAnalyticsView() {
  const { orders, products, customers, showToast } = useStore();

  const handleExportAnalytics = () => {
    const data = [
      { Metric: 'Average Order Value (AOV)', Value: '৳3,420', Growth: '+4.2%' },
      { Metric: 'Customer Retention Rate', Value: '68.4%', Growth: '+5.1%' },
      { Metric: 'Return / Refund Rate', Value: '1.2%', Growth: '-0.3%' },
      { Metric: 'Checkout Conversion Rate', Value: '3.64%', Growth: '+0.8%' },
      { Metric: 'bKash Online Share', Value: '54%', Growth: '+8%' },
      { Metric: 'Card Payment Share', Value: '24%', Growth: '+2%' }
    ];
    exportToCSV('Anonna_Mart_Analytics_Deep_Dive', data);
    showToast('Analytics Exported', 'Full commercial intelligence report generated.');
  };

  const funnelSteps = [
    { step: 'Storefront Visitors', count: '124,500', percent: '100%', drop: null },
    { step: 'Product Page Views', count: '48,200', percent: '38.7%', drop: '-61.3%' },
    { step: 'Added to Shopping Bag', count: '9,450', percent: '7.6%', drop: '-80.4%' },
    { step: 'Initiated Checkout', count: '4,120', percent: '3.3%', drop: '-56.4%' },
    { step: 'Completed & Paid Orders', count: '3,890', percent: '3.1%', drop: '-5.6%' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-950 font-display">
              Commercial Analytics & Insights
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
              Q4 2026 Fiscal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Holistic metrics covering funnel conversion efficiency, payment channel distributions, and customer lifetime trends.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportAnalytics}
            className="btn-secondary py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Intelligence CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card-premium p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Average Order Value (AOV)
          </span>
          <h3 className="text-2xl font-extrabold text-brand-950">৳3,420</h3>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+4.2% vs previous quarter</span>
          </div>
        </div>

        <div className="card-premium p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Repeat Customer Rate
          </span>
          <h3 className="text-2xl font-extrabold text-brand-950">68.4%</h3>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+5.1% brand loyalty score</span>
          </div>
        </div>

        <div className="card-premium p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Cart Abandonment Rate
          </span>
          <h3 className="text-2xl font-extrabold text-brand-950">42.8%</h3>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 mt-2">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>-3.4% recovery optimization</span>
          </div>
        </div>

        <div className="card-premium p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Refund & Return Rate
          </span>
          <h3 className="text-2xl font-extrabold text-brand-950">1.2%</h3>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 mt-2">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Well below 3% industry standard</span>
          </div>
        </div>
      </div>

      {/* Funnel & Traffic Channels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="card-premium p-6">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-base font-bold text-slate-900">E-Commerce Conversion Funnel</h3>
            <p className="text-xs text-slate-500">Step-by-step visitor progression to completed purchase</p>
          </div>

          <div className="space-y-4">
            {funnelSteps.map((step, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{step.step}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-brand-950">{step.count}</span>
                    <span className="text-[11px] text-slate-400">({step.percent})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-brand-900 to-gold-500 h-full rounded-full transition-all duration-700"
                    style={{ width: step.percent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Channels & Acquisition Channels */}
        <div className="card-premium p-6 space-y-6">
          <div>
            <div className="pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-base font-bold text-slate-900">Payment Gateway Distribution</h3>
              <p className="text-xs text-slate-500">Customer payment preference across Bangladesh</p>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { method: 'bKash Direct Gateway', share: '54%', amount: '৳282,900', color: '#E2136E' },
                { method: 'Visa / Mastercard Online', share: '24%', amount: '৳125,700', color: '#1A4D2E' },
                { method: 'Nagad Digital Wallet', share: '14%', amount: '৳73,300', color: '#F7941D' },
                { method: 'Cash on Delivery (COD)', share: '8%', amount: '৳42,000', color: '#64748B' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-slate-800">{item.method}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">{item.share}</span>
                    <span className="text-[11px] text-slate-400 ml-2">({item.amount})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
