import React from 'react';
import { Award, TrendingUp, Star, ChevronRight } from 'lucide-react';
import { useStore } from '@/components/providers/StoreContext';
import { formatCurrency } from '@/lib/utils/formatters';

export function TopProductsWidget() {
  const { products, setActiveTab, setEditingProduct } = useStore();

  const topProducts = [...products]
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .slice(0, 4);

  return (
    <div className="card-premium p-5 sm:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gold-50 text-gold-700 border border-gold-200">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Top Performing Products</h4>
            <p className="text-xs text-slate-500">Highest grossing catalog items</p>
          </div>
        </div>
      </div>

      <div className="flex-1 py-3 space-y-3 divide-y divide-slate-100">
        {topProducts.map((prod, index) => {
          const revenue = (prod.price || 0) * (prod.salesCount || 0);

          return (
            <div
              key={prod.id}
              onClick={() => {
                setActiveTab('products');
                setEditingProduct(prod);
              }}
              className="pt-3 first:pt-0 flex items-center justify-between gap-3 cursor-pointer group hover:bg-slate-50/50 p-1.5 rounded-xl transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-brand-950 text-gold-400 font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                    #{index + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-800 group-hover:text-brand-900 truncate">
                    {prod.name}
                  </h5>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    <span>{prod.salesCount} sold</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {prod.rating}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Revenue</span>
                <span className="text-xs font-bold text-emerald-700 block mt-1">
                  {formatCurrency(revenue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-100 mt-auto">
        <button
          onClick={() => setActiveTab('products')}
          className="w-full py-2 text-xs font-semibold text-brand-800 hover:text-brand-950 flex items-center justify-center gap-1.5 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <span>View catalog performance</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
