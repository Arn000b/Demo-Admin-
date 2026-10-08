import React, { useState } from 'react';
import {
  Users,
  Search,
  Download,
  Mail,
  Phone,
  MapPin,
  Award,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Building2,
  Star,
  Plus,
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportHelpers';

export function CustomerListView() {
  const { customers, vendors, orders, setSelectedOrderForDetail, showToast } = useStore();

  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'vendors'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Customers Filter
  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' || c.status.toLowerCase().includes(statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  // Vendors Filter
  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCustomers = () => {
    const rows = customers.map(c => ({
      ID: c.id,
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      City: c.city,
      TotalOrders: c.totalOrders,
      LifetimeValue: c.lifetimeValue,
      Status: c.status,
      JoinedDate: c.joinedDate
    }));
    exportToCSV('Anonna_Mart_Customer_Directory', rows);
    showToast('Customers Exported', 'Customer directory CSV downloaded.');
  };

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-950 font-display">
              Customer & Vendor Directory
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold-100 text-gold-900 border border-gold-300">
              {customers.length} Loyal Shoppers
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor client lifetime values (LTV), contact credentials, and verified artisan supply partnerships.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCustomers}
            className="btn-secondary py-2.5 px-3.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Contacts</span>
          </button>
        </div>
      </div>

      {/* Main Switcher & Toolbar */}
      <div className="card-premium p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Tab Switch */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'customers'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customer Base ({customers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'vendors'
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Artisan Vendors ({vendors.length})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'customers' ? 'Search by name, email, phone...' : 'Search vendor, contact...'}
              className="input-premium pl-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4">Lifetime Value (LTV)</th>
                  <th className="py-3.5 px-4">Account Tier</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={cust.avatar}
                          alt={cust.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400/30 shrink-0"
                        />
                        <div>
                          <p
                            className="font-bold text-slate-900 hover:text-brand-900 cursor-pointer"
                            onClick={() => handleCustomerClick(cust)}
                          >
                            {cust.name}
                          </p>
                          <span className="text-[11px] text-slate-400">Member since {formatDate(cust.joinedDate)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{cust.email}</p>
                      <p className="text-[11px] text-slate-500">{cust.phone}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {cust.city}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {cust.totalOrders} orders
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-brand-950 text-sm block">
                        {formatCurrency(cust.lifetimeValue)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        cust.status.includes('VIP')
                          ? 'bg-gold-100 text-gold-900 border border-gold-300'
                          : cust.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {cust.status.includes('VIP') && <Award className="w-3 h-3 text-gold-600" />}
                        <span>{cust.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleCustomerClick(cust)}
                        className="btn-secondary py-1 px-2.5 text-xs font-semibold"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VENDORS TAB */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filteredVendors.map(vendor => (
            <div key={vendor.id} className="card-premium p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-brand-900 text-gold-400 font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{vendor.name}</h4>
                      <p className="text-xs text-brand-800 font-semibold">{vendor.category}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {vendor.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-50 rounded-2xl text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Supplied</span>
                    <p className="text-xs font-bold text-slate-900">{vendor.totalSupplied} units</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Fulfillment</span>
                    <p className="text-xs font-bold text-emerald-700">{vendor.fulfillmentRate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Quality</span>
                    <p className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {vendor.rating}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact: <strong>{vendor.contactPerson}</strong></span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{vendor.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{vendor.phone}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Verified Vendor Agreement Active</span>
                <button
                  onClick={() => showToast('Vendor Inquired', `Message dispatched to ${vendor.contactPerson}`)}
                  className="btn-primary py-1 px-3 text-xs font-semibold"
                >
                  Contact Vendor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm"
            onClick={() => setSelectedCustomer(null)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-10 animate-slide-down">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCustomer.avatar}
                  alt={selectedCustomer.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gold-400"
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500">{selectedCustomer.email} • {selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-brand-50 rounded-2xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Orders Placed</span>
                <p className="text-lg font-extrabold text-brand-950">{selectedCustomer.totalOrders}</p>
              </div>
              <div className="p-3 bg-gold-50 rounded-2xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Spend</span>
                <p className="text-lg font-extrabold text-gold-900">{formatCurrency(selectedCustomer.lifetimeValue)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Customer Status</span>
                <p className="text-sm font-extrabold text-emerald-800 mt-1">{selectedCustomer.status}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl">
              <p><strong>Preferred Shopping Category:</strong> {selectedCustomer.favoriteCategory || 'Bed Sheets'}</p>
              <p><strong>Primary Address:</strong> {selectedCustomer.city}, Bangladesh</p>
              <p><strong>Registration Date:</strong> {formatDate(selectedCustomer.joinedDate, 'long')}</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
