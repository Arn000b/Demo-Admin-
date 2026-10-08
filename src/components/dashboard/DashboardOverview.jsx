import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Calendar,
  Download,
  Filter,
  ArrowRight,
  Sparkles,
  Layers,
  Megaphone
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { MetricCard } from './MetricCard';
import { InteractiveRevenueChart, CategoryDonutChart } from '../common/ChartComponents';
import { RecentOrdersWidget } from './RecentOrdersWidget';
import { LowStockWidget } from './LowStockWidget';
import { TopProductsWidget } from './TopProductsWidget';
import { formatCurrency } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportHelpers';

export function DashboardOverview() {
  const { products, orders, customers, banners, setActiveTab, showToast } = useStore();
  const [timeframe, setTimeframe] = useState('week');

  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 384500);
  const activeBanners = banners.filter(b => b.status === 'Active');

  const handleExportSummary = () => {
    const summaryData = [
      { Metric: 'Total Gross Sales', Value: formatCurrency(totalRevenue), Growth: '+18.4%' },
      { Metric: 'Total Orders Placed', Value: orders.length + 1240, Growth: '+12.6%' },
      { Metric: 'Total Customers', Value: customers.length + 3880, Growth: '+9.2%' },
      { Metric: 'Average Order Value (AOV)', Value: '৳3,420', Growth: '+4.1%' },
      { Metric: 'Store Conversion Rate', Value: '3.64%', Growth: '+0.8%' }
    ];
    exportToCSV('Anonna_Mart_Executive_Summary', summaryData);
    showToast('Report Exported', 'Executive summary CSV has been downloaded.');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-950 font-display">
              Executive Dashboard
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-100 text-gold-900 border border-gold-300">
              <Sparkles className="w-3 h-3 text-gold-600" />
              Live Pulse
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time commercial performance, inventory health, and order fulfillment overview.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeframe === 'week'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeframe === 'month'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={handleExportSummary}
            className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* Featured Promo Strip / Announcement Bar */}
      {activeBanners.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white p-4 sm:p-5 shadow-lg border border-brand-700">
          <div className="absolute -right-6 -bottom-8 opacity-15 pointer-events-none">
            <Megaphone className="w-48 h-48 text-gold-400" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-gold-400/20 text-gold-300 shrink-0">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-gold-400 text-brand-950">
                    Active Campaign
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {activeBanners[0].title}
                  </h4>
                </div>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  {activeBanners[0].subtitle} — Tracking {activeBanners[0].clicks} clicks
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('marketing')}
              className="btn-gold py-1.5 px-3 text-xs font-bold self-start sm:self-auto shrink-0"
            >
              <span>Manage Banners</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(totalRevenue)}
          changePercentage="18.4"
          isPositive={true}
          icon={DollarSign}
          accentColor="brand"
          sparklineData={[35, 42, 48, 60, 55, 78, 89, 98]}
        />
        <MetricCard
          title="Total Orders"
          value={`${orders.length + 1240}`}
          changePercentage="12.6"
          isPositive={true}
          icon={ShoppingBag}
          accentColor="emerald"
          sparklineData={[20, 28, 25, 38, 42, 49, 56, 68]}
        />
        <MetricCard
          title="Total Customers"
          value={`${customers.length + 3880}`}
          changePercentage="9.2"
          isPositive={true}
          icon={Users}
          accentColor="gold"
          sparklineData={[15, 22, 29, 34, 40, 48, 55, 62]}
        />
        <MetricCard
          title="Conversion Rate"
          value="3.64%"
          changePercentage="0.8"
          isPositive={true}
          icon={TrendingUp}
          accentColor="purple"
          sparklineData={[2.8, 3.1, 2.9, 3.2, 3.4, 3.5, 3.64]}
        />
      </div>

      {/* Charts Grid: Revenue Analytics & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Revenue Graph (2 cols) */}
        <div className="lg:col-span-2 card-premium p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Revenue & Growth Trend</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  +18.4%
                </span>
              </h3>
              <p className="text-xs text-slate-500">Gross sales performance comparison over time</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-900"></span>
                <span>Revenue (BDT)</span>
              </span>
            </div>
          </div>

          <InteractiveRevenueChart timeframe={timeframe} />
        </div>

        {/* Category Share Donut (1 col) */}
        <div className="card-premium p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Sales by Category</h3>
                <p className="text-xs text-slate-500">Revenue split across catalog sectors</p>
              </div>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>

            <CategoryDonutChart />
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-500">Top Sector:</span>
            <span className="font-bold text-brand-900">Bed Sheets & Linen (32%)</span>
          </div>
        </div>
      </div>

      {/* Second Row: Recent Orders, Low Stock Alerts, Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (takes 2 columns on desktop) */}
        <div className="lg:col-span-2">
          <RecentOrdersWidget />
        </div>

        {/* Low Stock Alert Widget (1 column) */}
        <div className="lg:col-span-1">
          <LowStockWidget />
        </div>
      </div>

      {/* Third Row: Top Selling Products */}
      <div>
        <TopProductsWidget />
      </div>
    </div>
  );
}
