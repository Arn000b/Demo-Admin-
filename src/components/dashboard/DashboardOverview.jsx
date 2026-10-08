import React, { useState } from 'react';
import { DollarSign, ShoppingBag, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { MetricCard } from './MetricCard';
import { InteractiveRevenueChart, CategoryDonutChart } from '../common/ChartComponents';
import { RecentOrdersWidget } from './RecentOrdersWidget';
import { LowStockWidget } from './LowStockWidget';
import { TopProductsWidget } from './TopProductsWidget';
import { formatCurrency } from '../../utils/formatters';

export function DashboardOverview() {
  const { products, orders, customers, setActiveTab } = useStore();
  const [timeframe, setTimeframe] = useState('week');

  const totalRevenue = orders.reduce((sum, order) => sum + (order.paymentStatus === 'Paid' ? order.total : 0), 0);
  const lowStockItems = products.filter(product => product.stock <= (product.minStockAlert || 5) && product.stock > 0);
  const outOfStockItems = products.filter(product => product.stock <= 0);
  const pendingOrders = orders.filter(order => ['Pending', 'Processing'].includes(order.orderStatus));
  const needsAttentionCount = lowStockItems.length + outOfStockItems.length + pendingOrders.length;
  const needsAttentionSummary = [
    lowStockItems.length ? `${lowStockItems.length} low stock` : null,
    outOfStockItems.length ? `${outOfStockItems.length} out of stock` : null,
    pendingOrders.length ? `${pendingOrders.length} pending` : null
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Here&apos;s what&apos;s happening with your store today.</p>
        </div>

        <label className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          <span className="sr-only">Select dashboard time range</span>
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value)}
            className="bg-transparent pr-2 text-sm font-medium text-slate-700 outline-none"
            aria-label="Select dashboard time range"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </label>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle="vs previous period"
          changePercentage={18.4}
          isPositive={true}
          icon={DollarSign}
          accentColor="brand"
          sparklineData={[35, 42, 48, 60, 55, 78, 89, 98]}
          onClick={() => setActiveTab('analytics')}
          trailing="View"
          showSparkline={false}
        />
        <MetricCard
          title="Orders"
          value={String(orders.length)}
          subtitle={`${pendingOrders.length} pending`}
          icon={ShoppingBag}
          accentColor="emerald"
          sparklineData={[20, 28, 25, 38, 42, 49, 56, 68]}
          isPositive={true}
          onClick={() => setActiveTab('orders')}
          trailing="View orders →"
          showSparkline={false}
        />
        <MetricCard
          title="Customers"
          value={String(customers.length)}
          subtitle="Active shoppers"
          icon={Users}
          accentColor="gold"
          sparklineData={[15, 22, 29, 34, 40, 48, 55, 62]}
          isPositive={true}
          onClick={() => setActiveTab('customers')}
          trailing="View details →"
          showSparkline={false}
        />
        <MetricCard
          title={needsAttentionCount ? 'Needs Attention' : 'Inventory Alerts'}
          value={String(needsAttentionCount)}
          subtitle={needsAttentionSummary || 'Everything is clear'}
          icon={AlertTriangle}
          accentColor="purple"
          sparklineData={[5, 8, 6, 9, 7, 10, 9, 12]}
          isPositive={false}
          onClick={() => setActiveTab('products')}
          trailing={needsAttentionCount ? 'Review →' : 'All clear'}
          showSparkline={false}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 card-premium p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Revenue</h2>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-brand-950">{formatCurrency(totalRevenue)}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              +18.4% vs previous period
            </span>
          </div>

          <div className="pt-4">
            <InteractiveRevenueChart timeframe={timeframe} />
          </div>
        </div>

        <div className="card-premium p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sales by Category</h2>
              <p className="text-xs text-slate-500">Revenue split across product lines</p>
            </div>
          </div>

          <div className="pt-4">
            <CategoryDonutChart />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentOrdersWidget />
        </div>

        <div>
          <LowStockWidget />
        </div>
      </div>

      <TopProductsWidget />
    </div>
  );
}
