import React from 'react';
import { ShoppingBag, Eye, FileText, ArrowRight } from 'lucide-react';
import { useStore } from '@/components/providers/StoreContext';
import { OrderStatusBadge } from '../common/Badge';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

export function RecentOrdersWidget() {
  const {
    orders,
    setSelectedOrderForDetail,
    setSelectedOrderForInvoice,
    setActiveTab
  } = useStore();

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="card-premium p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-50 text-brand-900 border border-brand-200">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Recent Orders</h4>
            <p className="text-xs text-slate-500">Latest orders and fulfillment status</p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('orders')}
          className="text-xs font-semibold text-brand-800 hover:text-brand-950 flex items-center gap-1.5 transition-colors"
        >
          <span>View all orders</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <th className="py-3 px-2">Order</th>
              <th className="py-3 px-2">Customer</th>
              <th className="py-3 px-2">Items</th>
              <th className="py-3 px-2">Total</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 text-xs">
            {recentOrders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/70 transition-colors group">
                <td className="py-3 px-2">
                  <span className="font-mono font-bold text-brand-950 block">{order.id}</span>
                  <span className="text-[10px] text-slate-400">{formatDate(order.date)}</span>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={order.customer.avatar}
                      alt={order.customer.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-slate-800 line-clamp-1">{order.customer.name}</p>
                      <p className="text-[10px] text-slate-400">{order.customer.city}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 text-slate-600 font-medium">
                  {order.items.length} item{order.items.length > 1 ? 's' : ''}
                </td>
                <td className="py-3 px-2 font-bold text-slate-900">
                  {formatCurrency(order.total)}
                </td>
                <td className="py-3 px-2">
                  <OrderStatusBadge status={order.orderStatus} />
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                    <button
                      onClick={() => setSelectedOrderForDetail(order)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-brand-900 hover:bg-brand-50 transition-colors"
                      title="View order details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedOrderForInvoice(order)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-gold-700 hover:bg-gold-50 transition-colors"
                      title="Print invoice"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
