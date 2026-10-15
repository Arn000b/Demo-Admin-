'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, RefreshCw, Truck } from 'lucide-react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export function VendorWorkspace() {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shipmentRows, setShipmentRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const shipments = useMemo(() => {
    const groups = new Map();
    shipmentRows.forEach((row) => {
      const shipment = row.shipment;
      const group = groups.get(shipment.id) ?? { ...shipment, orderNumber: row.orderNumber, lines: [] };
      group.lines.push({ id: row.line.id, name: row.line.name, sku: row.line.sku, quantity: row.item.quantity });
      groups.set(shipment.id, group);
    });
    return [...groups.values()];
  }, [shipmentRows]);
  const orderGroups = useMemo(() => {
    const groups = new Map();
    orders.forEach((line) => {
      const group = groups.get(line.orderId) ?? { orderId: line.orderId, orderNumber: line.orderNumber, status: line.orderStatus, date: line.orderDate, lines: [] };
      group.lines.push(line); groups.set(line.orderId, group);
    });
    return [...groups.values()];
  }, [orders]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const responses = await Promise.all([
        fetch(`${api}/vendor/summary`, { credentials: 'include' }),
        fetch(`${api}/vendor/products?page=1&pageSize=50`, { credentials: 'include' }),
        fetch(`${api}/vendor/orders?page=1&pageSize=100`, { credentials: 'include' }),
        fetch(`${api}/vendor/shipments?page=1&pageSize=100`, { credentials: 'include' }),
      ]);
      const bodies = await Promise.all(responses.map((response) => response.json().catch(() => null)));
      const failed = responses.findIndex((response) => !response.ok);
      if (failed >= 0) throw new Error(bodies[failed]?.error ?? 'Could not load vendor workspace.');
      setSummary(bodies[0]?.data); setProducts(bodies[1]?.data ?? []); setOrders(bodies[2]?.data ?? []); setShipmentRows(bodies[3]?.data ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load vendor workspace.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function createShipment(order) {
    const allocated = new Map();
    shipmentRows.filter((row) => row.shipment.orderId === order.orderId).forEach((row) => allocated.set(row.line.id, (allocated.get(row.line.id) ?? 0) + row.item.quantity));
    const items = order.lines.map((line) => ({ orderItemId: line.orderItemId, quantity: line.quantity - (allocated.get(line.orderItemId) ?? 0) })).filter((line) => line.quantity > 0);
    if (!items.length) { setError('No unallocated units remain for this order.'); return; }
    const draft = drafts[order.orderId] ?? {};
    setBusy(true); setError('');
    try {
      const response = await fetch(`${api}/orders/${order.orderId}/shipments`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items, ...(draft.courierName ? { courierName: draft.courierName } : {}), ...(draft.trackingNumber ? { trackingNumber: draft.trackingNumber } : {}) }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not create shipment.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create shipment.'); }
    finally { setBusy(false); }
  }

  async function advanceShipment(shipment, status) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${api}/shipments/${shipment.id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not update shipment.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update shipment.'); }
    finally { setBusy(false); }
  }

  return <section className="space-y-6" aria-labelledby="vendor-workspace-heading">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-700">Vendor workspace</p><h1 id="vendor-workspace-heading" className="text-2xl font-bold text-slate-900">Your operations</h1><p className="text-sm text-slate-500">Catalog and order data is scoped to your vendor account.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4"/>Refresh</button></header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {summary && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Products', summary.products], ['Order lines', summary.orderLines], ['On hand', summary.onHandUnits], ['Reserved', summary.reservedUnits]].map(([name, value]) => <div key={name} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{name}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div>)}</div>}
    <div className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold text-slate-900">Your catalog</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Variants</th><th className="px-4 py-3">SKUs</th><th className="px-4 py-3">Updated</th></tr></thead><tbody className="divide-y">{products.map((product) => <tr key={product.id}><td className="px-4 py-3 font-medium">{product.name}</td><td className="px-4 py-3">{product.variants.length}</td><td className="px-4 py-3">{product.variants.map((variant) => variant.sku).join(', ') || '—'}</td><td className="px-4 py-3">{new Date(product.updatedAt).toLocaleDateString()}</td></tr>)}{!loading && !products.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No products assigned.</td></tr>}</tbody></table></div></div>
    <div className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold text-slate-900">Your order lines</h2><p className="text-xs text-slate-500">Order-wide totals and customer email are omitted.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Placed</th></tr></thead><tbody className="divide-y">
      {orders.map((line) => <tr key={line.orderItemId}><td className="px-4 py-3 font-mono">{line.orderNumber}</td><td className="px-4 py-3 font-medium">{line.name}</td><td className="px-4 py-3">{line.sku}</td><td className="px-4 py-3">{line.quantity}</td><td className="px-4 py-3">{line.orderStatus}</td><td className="px-4 py-3">{new Date(line.orderDate).toLocaleDateString()}</td></tr>)}
      {!loading && !orders.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500"><Package className="mx-auto mb-2 h-5 w-5"/>No order lines found.</td></tr>}
    </tbody></table></div>
    <div className="space-y-3 border-t p-4"><h3 className="text-sm font-semibold">Create a shipment</h3>{orderGroups.filter((order) => ['confirmed', 'processing', 'shipped'].includes(order.status)).map((order) => <form key={order.orderId} onSubmit={(event) => { event.preventDefault(); void createShipment(order); }} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><p className="text-sm font-medium">{order.orderNumber} <span className="font-normal text-slate-500">({order.lines.length} seller line{order.lines.length === 1 ? '' : 's'})</span></p><div className="flex gap-2"><input aria-label={`Courier for ${order.orderNumber}`} maxLength={120} placeholder="Courier (optional)" value={drafts[order.orderId]?.courierName ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [order.orderId]: { ...current[order.orderId], courierName: event.target.value } }))} className="min-w-0 w-1/2 rounded-md border px-2 py-1.5 text-xs"/><input aria-label={`Tracking number for ${order.orderNumber}`} maxLength={120} placeholder="Tracking number (optional)" value={drafts[order.orderId]?.trackingNumber ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [order.orderId]: { ...current[order.orderId], trackingNumber: event.target.value } }))} className="min-w-0 w-1/2 rounded-md border px-2 py-1.5 text-xs"/></div><button disabled={busy} className="rounded-md bg-emerald-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Allocate remaining</button></form>)}</div></div>
    <div className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="flex items-center gap-2 font-semibold text-slate-900"><Truck className="h-4 w-4"/>Your shipments</h2></div><div className="divide-y">{shipments.map((shipment) => { const next = shipment.status === 'pending' ? 'shipped' : shipment.status === 'shipped' ? 'in_transit' : shipment.status === 'in_transit' ? 'delivered' : null; return <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-mono text-sm font-semibold">{shipment.orderNumber} · {shipment.status}</p><p className="text-xs text-slate-500">{shipment.courierName || 'Courier not set'}{shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ''} · {shipment.lines.length} allocation(s)</p></div>{next && <button disabled={busy} onClick={() => void advanceShipment(shipment, next)} className="rounded-md border px-3 py-2 text-xs font-semibold disabled:opacity-60">Mark {next.replace('_', ' ')}</button>}</div>; })}{!loading && !shipments.length && <p className="px-5 py-8 text-center text-sm text-slate-500">No shipments yet.</p>}</div></div>
  </section>;
}
