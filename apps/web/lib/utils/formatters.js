// Formatting and helper utilities

export function formatCurrency(amount, symbol = '৳') {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return `${symbol}0`;
  return `${symbol}${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatCompactCurrency(amount, symbol = '৳') {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return `${symbol}0`;

  const numericAmount = Number(amount);

  if (numericAmount >= 1000000) {
    return `${symbol}${(numericAmount / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  }

  if (numericAmount >= 1000) {
    return `${symbol}${(numericAmount / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  }

  return formatCurrency(numericAmount, symbol);
}

export function formatDate(dateString, format = 'short') {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  if (format === 'time') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return formatDate(dateString, 'short');
}

export function getOrderStatusStyle(status) {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Delivered'
      };
    case 'processing':
    case 'shipped':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        label: status.charAt(0).toUpperCase() + status.slice(1)
      };
    case 'pending':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Pending'
      };
    case 'cancelled':
    case 'refunded':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        label: status.charAt(0).toUpperCase() + status.slice(1)
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        label: status || 'Unknown'
      };
  }
}

export function getStockStatusStyle(status) {
  switch (status?.toLowerCase()) {
    case 'in stock':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'In Stock'
      };
    case 'low stock':
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Low Stock'
      };
    case 'out of stock':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        label: 'Out of Stock'
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        label: status
      };
  }
}
