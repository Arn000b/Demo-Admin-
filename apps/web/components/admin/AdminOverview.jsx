'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`${api}/admin/overview`, { credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not load administration summary.');
      setData(body.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load administration summary.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="space-y-6" aria-labelledby="admin-overview-heading">
    <header className="flex items-center justify-between"><div><p className="text-sm font-semibold text-emerald-700">Live administration</p><h1 id="admin-overview-heading" className="text-2xl font-bold text-slate-900">Overview</h1><p className="text-sm text-slate-500">Counts from current database records. Monetary reporting is not included.</p></div><button onClick={() => void load()} className="rounded-lg border bg-white p-2" aria-label="Refresh overview"><RefreshCw className="h-4 w-4"/></button></header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {data && <><div className="grid gap-3 sm:grid-cols-3">{[['Customers', data.customers], ['Vendors', data.vendors], ['Products', data.products]].map(([label, value]) => <article key={label} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p></article>)}</div><section className="rounded-xl border bg-white p-5"><h2 className="font-semibold text-slate-900">Orders by status</h2><div className="mt-3 flex flex-wrap gap-2">{data.ordersByStatus.map((row) => <span key={row.status} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{row.status}: {row.count}</span>)}{!data.ordersByStatus.length && <p className="text-sm text-slate-500">No orders recorded.</p>}</div></section></>}
  </section>;
}
