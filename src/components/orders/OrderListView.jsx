import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  ArrowUpDown,
  CreditCard
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatusBadge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportHelpers';

const STATUS_TABS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export function OrderListView() {
  const {
    orders,
    setSelectedOrderForDetail,
    setSelectedOrderForInvoice,
    updateOrderStatus,
    showToast
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Filter Orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.phone.includes(searchQuery) ||
      order.customer.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatusTab === 'All' ||
      order.orderStatus.toLowerCase() === selectedStatusTab.toLowerCase();

    const matchesPayment =
      paymentFilter === 'All' ||
      order.paymentMethod.toLowerCase().includes(paymentFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPayment;
  }).sort((a, b) => {
    if (sortBy === 'highest') return b.total - a.total;
    if (sortBy === 'lowest') return a.total - b.total;
    return new Date(b.date) - new Date(a.date);
  });

  const handleExportCSV = () => {
    const rows = filteredOrders.map(o => ({
      OrderID: o.id,
      InvoiceNo: o.invoiceNumber,
      Customer: o.customer.name,
      Phone: o.customer.phone,
      Email: o.customer.email,
      City: o.customer.city,
      TotalAmount: o.total,
      PaymentMethod: o.paymentMethod,
      PaymentStatus: o.paymentStatus,
      OrderStatus: o.orderStatus,
      ItemsCount: o.items.length,
      Date: o.date
    }));
    exportToCSV('Anonna_Mart_Orders_Report', rows);
    showToast('Orders Exported', 'Orders CSV summary downloaded.');
  };

  const pendingCount = orders.filter(o => o.orderStatus === 'Pending').length;
  const processingCount = orders.filter(o => o.orderStatus === 'Processing').length;
  const deliveredCount = orders.filter(o => o.orderStatus === 'Delivered').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-950 font-display">
              Order Fulfillment & Management
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
              {orders.length} Orders
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track real-time transactions, generate VAT invoices, and manage logistics dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="btn-secondary py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Orders CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          className="card-premium p-4 flex items-center gap-3.5 cursor-pointer hover:border-slate-300 transition-colors"
          onClick={() => setSelectedStatusTab('Pending')}
        >
          <div className="p-3 rounded-2xl bg-gold-100/70 text-gold-900">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Pending</span>
            <h4 className="text-xl font-extrabold text-slate-900">{pendingCount} orders</h4>
          </div>
        </div>

        <div 
          className="card-premium p-4 flex items-center gap-3.5 cursor-pointer hover:border-slate-300 transition-colors"
          onClick={() => setSelectedStatusTab('Processing')}
        >
          <div className="p-3 rounded-2xl bg-blue-100 text-blue-800">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Processing</span>
            <h4 className="text-xl font-extrabold text-slate-900">{processingCount} orders</h4>
          </div>
        </div>

        <div 
          className="card-premium p-4 flex items-center gap-3.5 cursor-pointer hover:border-slate-300 transition-colors"
          onClick={() => setSelectedStatusTab('Delivered')}
        >
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Delivered</span>
            <h4 className="text-xl font-extrabold text-slate-900">{deliveredCount} orders</h4>
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="card-premium p-4 sm:p-5 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => {
            const count = tab === 'All'
              ? orders.length
              : orders.filter(o => o.orderStatus.toLowerCase() === tab.toLowerCase()).length;

            return (
              <button
                key={tab}
                onClick={() => setSelectedStatusTab(tab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatusTab === tab
                    ? 'bg-brand-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStatusTab === tab ? 'bg-gold-400 text-brand-950' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search and Secondary Selectors */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, customer, phone..."
              className="input-premium pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="All">All Payment Methods</option>
                <option value="bKash">bKash Online</option>
                <option value="Nagad">Nagad Gateway</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="newest">Most Recent</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    No orders found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedOrderForDetail(order)}>
                      <span className="font-mono font-bold text-brand-950 block hover:text-brand-700">{order.id}</span>
                      <span className="text-[11px] text-slate-400">{formatDate(order.date)}</span>
                    </td>

                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedOrderForDetail(order)}>
                      <div className="flex items-center gap-2.5">
                        <img
                          src={order.customer.avatar}
                          alt={order.customer.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{order.customer.name}</p>
                          <p className="text-[10px] text-slate-400">{order.customer.city} • {order.customer.phone}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedOrderForDetail(order)}>
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-2 overflow-hidden">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <img
                              key={idx}
                              src={item.image}
                              alt={item.name}
                              className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                              title={item.name}
                            />
                          ))}
                        </div>
                        <span className="text-slate-600 font-medium ml-1">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedOrderForDetail(order)}>
                      <span className="font-extrabold text-brand-950 text-sm block">
                        {formatCurrency(order.total)}
                      </span>
                      {order.discount > 0 && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Saved {formatCurrency(order.discount)}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedOrderForDetail(order)}>
                      <p className="font-semibold text-slate-800">{order.paymentMethod}</p>
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                        order.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : order.paymentStatus === 'Refunded'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-gold-50 text-gold-900'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={order.orderStatus}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 font-bold rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-700/20 focus:outline-none cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-900 hover:bg-brand-50 transition-colors"
                          title="View Order"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedOrderForInvoice(order)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-gold-700 hover:bg-gold-50 transition-colors"
                          title="View Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
