'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const definitions = {
  products: { title: 'Products', route: '/products', columns: (row) => [row.name, row.vendorId, row.categoryId, row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'] },
  customers: { title: 'Customers', route: '/customers', columns: (row) => [row.name, row.email, row.phone || '—', row.status] },
  orders: { title: 'Orders', route: '/admin/orders', columns: (row) => [row.orderNumber, row.customerName, row.status, row.grandTotal, new Date(row.orderDate).toLocaleDateString()] },
};

export function AdminRecords({ kind }) {
  const definition = definitions[kind];
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 0, total: 0 });
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (kind === 'orders' && status) query.set('status', status);
      const response = await fetch(`${api}${definition.route}?${query}`, { credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? `Could not load ${definition.title.toLowerCase()}.`);
      setRows(body.data ?? []); setMeta(body.meta ?? { totalPages: 0, total: 0 });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load records.'); }
  }, [definition, kind, page, status]);
  useEffect(() => { void load(); }, [load]);

  async function openOrder(id) {
    try {
      const response = await fetch(`${api}/admin/orders/${id}`, { credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not load order details.');
      setDetail(body.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load order details.'); }
  }

  const headings = kind === 'products' ? ['Product', 'Vendor ID', 'Category ID', 'Created'] : kind === 'customers' ? ['Customer', 'Email', 'Phone', 'Status'] : ['Order', 'Customer', 'Status', 'Total', 'Placed'];
  return <section className="space-y-5" aria-labelledby={`${kind}-heading`}>
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-700">Live administration</p><h1 id={`${kind}-heading`} className="text-2xl font-bold text-slate-900">{definition.title}</h1><p className="text-sm text-slate-500">{meta.total} records · read-only view</p></div><div className="flex items-center gap-2">{kind === 'orders' && <select aria-label="Filter orders by status" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map((value) => <option key={value} value={value}>{value}</option>)}</select>}<button onClick={() => void load()} className="rounded-lg border bg-white p-2" aria-label="Refresh records"><RefreshCw className="h-4 w-4"/></button></div></header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headings.map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}{kind === 'orders' && <th className="px-4 py-3">Details</th>}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}>{definition.columns(row).map((value, index) => <td key={index} className="px-4 py-3">{value ?? '—'}</td>)}{kind === 'orders' && <td className="px-4 py-3"><button onClick={() => void openOrder(row.id)} className="rounded-md border p-1.5" aria-label={`View ${row.orderNumber}`}><Eye className="h-4 w-4"/></button></td>}</tr>)}{!rows.length && <tr><td colSpan={headings.length + (kind === 'orders' ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">No records found.</td></tr>}</tbody></table></div>
    <footer className="flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft className="h-4 w-4"/>Previous</button><span className="text-sm text-slate-500">Page {page} of {Math.max(1, meta.totalPages)}</span><button disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50">Next<ChevronRight className="h-4 w-4"/></button></footer>
    {detail && <div role="dialog" aria-modal="true" aria-label="Order details" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setDetail(null)}><article className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">{detail.orderNumber}</h2><p className="text-sm text-slate-500">{detail.status} · {new Date(detail.orderDate).toLocaleString()}</p></div><button onClick={() => setDetail(null)} className="rounded-md border px-3 py-1.5 text-sm">Close</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><p>Items: {detail.itemsTotal}</p><p>Discount: {detail.discountTotal}</p><p>Shipping: {detail.shippingFee}</p><p>Tax: {detail.taxTotal}</p><p className="font-semibold">Total: {detail.grandTotal}</p></div><h3 className="mt-5 font-semibold">Order lines</h3><ul className="mt-2 divide-y">{detail.items.map((item) => <li key={item.id} className="flex justify-between gap-4 py-2 text-sm"><span>{item.name} ({item.sku}) × {item.quantity}</span><span>{item.purchasedPrice}</span></li>)}</ul><h3 className="mt-5 font-semibold">Payments</h3><ul className="mt-2 divide-y">{detail.payments.map((payment) => <li key={payment.id} className="flex justify-between gap-4 py-2 text-sm"><span>{payment.paymentMethod} · {payment.status}</span><span>{payment.amount}</span></li>)}{!detail.payments.length && <li className="py-2 text-sm text-slate-500">No payment attempts.</li>}</ul></article></div>}
  </section>;
}
