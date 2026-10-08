import React from 'react';
import { getOrderStatusStyle, getStockStatusStyle } from '../../utils/formatters';

export function OrderStatusBadge({ status, className = '' }) {
  const style = getOrderStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.bg} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse-subtle`}></span>
      <span>{style.label}</span>
    </span>
  );
}

export function StockBadge({ status, stock, className = '' }) {
  const style = getStockStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
      <span>{style.label} {stock !== undefined && `(${stock})`}</span>
    </span>
  );
}

export function CategoryBadge({ category, className = '' }) {
  let colors = 'bg-slate-100 text-slate-700 border-slate-200';
  if (category?.includes('Bed Sheets')) {
    colors = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (category?.includes('Fashion')) {
    colors = 'bg-purple-50 text-purple-800 border-purple-200';
  } else if (category?.includes('Organic')) {
    colors = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (category?.includes('Decor')) {
    colors = 'bg-teal-50 text-teal-800 border-teal-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${colors} ${className}`}>
      {category}
    </span>
  );
}
