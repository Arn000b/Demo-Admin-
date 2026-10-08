import React from 'react';
import { AlertTriangle, Plus, ChevronRight, PackageCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { StockBadge } from '../common/Badge';

export function LowStockWidget() {
  const { products, updateProduct, setActiveTab, showToast } = useStore();

  const lowStockItems = products.filter(p => p.stock <= (p.minStockAlert || 5));

  const handleQuickRestock = (product) => {
    const newStock = product.stock + 20;
    updateProduct(product.id, { stock: newStock });
    showToast('Inventory Restocked', `Added +20 units to ${product.name}`);
  };

  return (
    <div className="card-premium p-5 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Low Stock Alerts</h4>
            <p className="text-xs text-slate-500">Items nearing inventory exhaustion</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100/70 text-amber-800">
          {lowStockItems.length} alerts
        </span>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 divide-y divide-slate-100/80">
        {lowStockItems.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <PackageCheck className="w-10 h-10 text-emerald-500 mb-2" />
            <p className="text-sm font-medium text-slate-700">Inventory Healthy</p>
            <p className="text-xs text-slate-400 mt-0.5">All products are adequately stocked.</p>
          </div>
        ) : (
          lowStockItems.map((prod) => (
            <div key={prod.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-800 truncate" title={prod.name}>
                    {prod.name}
                  </h5>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400 font-mono">{prod.sku}</span>
                    <StockBadge status={prod.status} stock={prod.stock} />
                  </div>
                </div>
              </div>

              {/* Quick Restock Action */}
              <button
                onClick={() => handleQuickRestock(prod)}
                className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors flex items-center gap-1 shadow-2xs"
                title="Quick Restock +20 units"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+20</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer link to catalog */}
      <div className="pt-3 border-t border-slate-100 mt-auto">
        <button
          onClick={() => setActiveTab('products')}
          className="w-full py-2 text-xs font-semibold text-brand-800 hover:text-brand-950 flex items-center justify-center gap-1.5 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <span>Manage Full Inventory</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
