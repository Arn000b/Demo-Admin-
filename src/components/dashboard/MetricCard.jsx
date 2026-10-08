import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '../common/ChartComponents';

export function MetricCard({
  title,
  value,
  previousValue,
  changePercentage,
  isPositive = true,
  icon: Icon,
  sparklineData = [20, 40, 35, 50, 49, 60, 70, 91],
  accentColor = 'brand'
}) {
  return (
    <div className="card-premium p-5 sm:p-6 relative overflow-hidden group">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-gold-100/40 via-brand-50/20 to-transparent rounded-bl-full pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-60" />

      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            {title}
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-950 tracking-tight">
            {value}
          </h3>
        </div>

        <div
          className={`p-3 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-110 ${
            accentColor === 'gold'
              ? 'bg-gold-50 text-gold-800 border border-gold-200'
              : accentColor === 'emerald'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : accentColor === 'purple'
              ? 'bg-purple-50 text-purple-800 border border-purple-200'
              : 'bg-brand-50 text-brand-900 border border-brand-200'
          }`}
        >
          {Icon && <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />}
        </div>
      </div>

      <div className="flex items-end justify-between pt-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isPositive ? `+${changePercentage}%` : `-${changePercentage}%`}</span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">vs last month</span>
        </div>

        {/* Sparkline Visual */}
        <Sparkline
          data={sparklineData}
          isPositive={isPositive}
          color={isPositive ? '#0F3821' : '#E11D48'}
        />
      </div>
    </div>
  );
}
