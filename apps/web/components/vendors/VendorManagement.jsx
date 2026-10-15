'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, Store } from 'lucide-react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const blankForm = { name: '', email: '', phone: '', address: '', commissionRate: '0.00' };

export function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [linkEmails, setLinkEmails] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const [vendorResponse, overviewResponse] = await Promise.all([
      fetch(`${api}/admin/vendors?page=1&pageSize=100`, { credentials: 'include' }),
      fetch(`${api}/admin/overview`, { credentials: 'include' }),
    ]);
    const vendorBody = await vendorResponse.json().catch(() => null);
    const overviewBody = await overviewResponse.json().catch(() => null);
    if (!vendorResponse.ok || !overviewResponse.ok) {
      setError(vendorBody?.error ?? overviewBody?.error ?? 'Could not load vendor administration.');
      return;
    }
    setVendors(vendorBody.data ?? []);
    setOverview(overviewBody.data ?? null);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createVendor(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${api}/admin/vendors`, {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, phone: form.phone || null, address: form.address || null }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not create vendor.');
      setForm(blankForm); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create vendor.'); }
    finally { setBusy(false); }
  }

  async function setStatus(id, status) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${api}/admin/vendors/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not update vendor.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update vendor.'); }
    finally { setBusy(false); }
  }

  async function linkAccount(event, id) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${api}/admin/vendors/${id}/account`, {
        method: 'PUT', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: linkEmails[id] }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not link vendor account.');
      setLinkEmails((current) => ({ ...current, [id]: '' })); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not link vendor account.'); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-6" aria-labelledby="vendors-heading">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-emerald-700">Administration</p><h1 id="vendors-heading" className="text-2xl font-bold text-slate-900">Vendors</h1><p className="text-sm text-slate-500">Manage vendor profiles and access status.</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700"><RefreshCw className="h-4 w-4"/>Refresh</button>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {overview && <div className="grid gap-3 sm:grid-cols-3">{[['Customers', overview.customers], ['Vendors', overview.vendors], ['Products', overview.products]].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div>)}</div>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-5 py-4"><h2 className="font-semibold text-slate-900">Vendor profiles</h2></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">
            {vendors.map((vendor) => <tr key={vendor.id}><td className="px-4 py-3"><p className="font-semibold text-slate-900">{vendor.name}</p><p className="text-xs text-slate-500">{vendor.email}</p></td><td className="px-4 py-3">{vendor.commissionRate}%</td><td className="px-4 py-3">{vendor.accountLinked ? 'Linked' : <form onSubmit={(event) => void linkAccount(event, vendor.id)} className="flex min-w-56 gap-1"><input required type="email" aria-label={`Provisioned vendor account email for ${vendor.name}`} value={linkEmails[vendor.id] ?? ''} onChange={(event) => setLinkEmails((current) => ({ ...current, [vendor.id]: event.target.value }))} placeholder="Provisioned account email" className="min-w-0 rounded-md border px-2 py-1 text-xs"/><button disabled={busy} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold disabled:opacity-60">Link</button></form>}</td><td className="px-4 py-3"><select disabled={busy} aria-label={`Status for ${vendor.name}`} value={vendor.status} onChange={(event) => void setStatus(vendor.id, event.target.value)} className="rounded-md border px-2 py-1"><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="closed">Closed</option></select></td></tr>)}
            {!vendors.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No vendor profiles yet.</td></tr>}
          </tbody></table></div>
        </div>
        <form onSubmit={createVendor} className="space-y-3 rounded-xl border bg-white p-5">
          <div className="flex items-center gap-2"><Store className="h-5 w-5 text-emerald-700"/><h2 className="font-semibold text-slate-900">Add vendor profile</h2></div>
          <p className="text-xs leading-5 text-slate-500">Profiles start pending. This does not create a login or assign a role.</p>
          <label className="block text-sm font-medium">Business name<input required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
          <label className="block text-sm font-medium">Email<input required type="email" maxLength={320} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
          <label className="block text-sm font-medium">Phone<input maxLength={32} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
          <label className="block text-sm font-medium">Address<textarea maxLength={10000} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
          <label className="block text-sm font-medium">Commission rate<input required inputMode="decimal" pattern="(?:100(?:\.0{1,2})?|(?:0|[1-9]\d?)(?:\.\d{1,2})?)" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
          <button disabled={busy} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Check className="h-4 w-4"/>Create pending profile</button>
        </form>
      </div>
    </section>
  );
}
