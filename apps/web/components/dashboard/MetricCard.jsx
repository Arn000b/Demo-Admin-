import React from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '../common/ChartComponents';

export function MetricCard({
  title,
  value,
  subtitle,
  changePercentage,
  isPositive = true,
  icon: Icon,
  sparklineData = [20, 40, 35, 50, 49, 60, 70, 91],
  accentColor = 'brand',
  onClick,
  trailing,
  showSparkline = false
}) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
      className={`card-premium p-4 sm:p-5 relative overflow-hidden group transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:border-brand-200 hover:shadow-card' : ''
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/80 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-2">
            {title}
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-brand-950 tracking-tight truncate">
            {value}
          </h3>
        </div>

        <div
          className={`p-2.5 rounded-xl shrink-0 border ${
            accentColor === 'gold'
              ? 'bg-gold-50 text-gold-800 border-gold-200'
              : accentColor === 'emerald'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : accentColor === 'purple'
              ? 'bg-purple-50 text-purple-800 border-purple-200'
              : 'bg-brand-50 text-brand-900 border-brand-200'
          }`}
        >
          {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {changePercentage !== undefined && changePercentage !== null ? (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isPositive ? `+${changePercentage}%` : `${changePercentage}%`}</span>
            </span>
          ) : null}
          {subtitle ? (
            <p className="mt-2 text-[11px] text-slate-500 font-medium truncate">{subtitle}</p>
          ) : null}
        </div>

        {showSparkline ? (
          <div className="flex items-center gap-2 shrink-0">
            <Sparkline
              data={sparklineData}
              isPositive={isPositive}
              color={isPositive ? '#0F3821' : '#E11D48'}
            />
            {trailing ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-800">
                {trailing}
                <ArrowUpRight className="w-3 h-3" />
              </span>
            ) : null}
          </div>
        ) : trailing ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-800 shrink-0">
            {trailing}
            <ArrowUpRight className="w-3 h-3" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
