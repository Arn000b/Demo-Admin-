'use client';

import { useState, type FormEvent } from 'react';
import { MapPin, Plus, Trash2, X } from 'lucide-react';
import { useCustomerDemo, type DemoAddress } from '@/components/providers/CustomerDemoContext';

const fieldClass = 'input-premium min-h-12 rounded-lg px-3 text-base';
const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2';

export function AccountAddresses() {
  const { addresses, profile, saveAddress, deleteAddress, setDefaultAddress } = useCustomerDemo();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DemoAddress | null>(null);
  const [label, setLabel] = useState('Home');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const startAdd = () => {
    setEditingId(null);
    setLabel('Home');
    setRecipient(profile.name);
    setPhone('');
    setAddress('');
    setIsDefault(addresses.length === 0);
    setError('');
    setFormOpen(true);
  };

  const startEdit = (item: DemoAddress) => {
    setEditingId(item.id);
    setLabel(item.label);
    setRecipient(item.recipient);
    setPhone(item.phone);
    setAddress(item.address);
    setIsDefault(item.isDefault);
    setError('');
    setFormOpen(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipient.trim() || !address.trim()) {
      setError('Enter the recipient name and delivery address.');
      return;
    }
    saveAddress({
      id: editingId || `address-${Date.now()}`,
      label,
      recipient: recipient.trim(),
      phone: phone.trim(),
      address: address.trim(),
      isDefault: isDefault || addresses.length === 0,
    });
    setError('');
    setNotice(editingId ? 'Address updated.' : 'Address saved.');
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteAddress(pendingDelete.id);
    setPendingDelete(null);
    setNotice('Address removed.');
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7" aria-labelledby="addresses-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Delivery preferences</p>
          <h1 id="addresses-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Saved addresses</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Manage your delivery addresses for a faster checkout.</p>
        </div>
        {addresses.length > 0 && (
          <button type="button" onClick={startAdd} className={`${primaryButtonClass} shrink-0`}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add address
          </button>
        )}
      </div>

      {notice && <p role="status" className="mt-5 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{notice}</p>}

      {addresses.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {addresses.map((item) => (
            <article key={item.id} className="min-w-0 rounded-2xl border border-slate-200/80 p-4 transition hover:border-emerald-600/40 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-800" aria-hidden="true" />
                  <h2 className="break-words font-semibold text-slate-900">{item.label}</h2>
                </div>
                {item.isDefault && <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-900">Default</span>}
              </div>
              <p className="mt-3 break-words text-sm font-medium text-slate-900">{item.recipient}</p>
              {item.phone && <p className="mt-1 break-words text-sm text-slate-600">{item.phone}</p>}
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{item.address}</p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => startEdit(item)} className="btn-secondary min-h-10 px-3 py-2 text-sm">Edit</button>
                {!item.isDefault && <button type="button" onClick={() => setDefaultAddress(item.id)} className="btn-secondary min-h-10 px-3 py-2 text-sm">Set as default</button>}
                <button type="button" onClick={() => setPendingDelete(item)} aria-label={`Delete ${item.label} address`} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <MapPin className="mx-auto h-8 w-8 text-emerald-800" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-slate-900">No saved addresses yet</h2>
          <p className="mt-1 text-sm text-slate-600">Add a delivery address to make your next checkout quicker.</p>
          <button type="button" onClick={startAdd} className={`${primaryButtonClass} mt-5`}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add address
          </button>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="address-form-heading" onKeyDown={(event) => { if (event.key === 'Escape') setFormOpen(false); }} className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="address-form-heading" className="text-xl font-bold text-slate-950">{editingId ? 'Edit address' : 'Add address'}</h2>
                <p className="mt-1 text-sm text-slate-600">Enter the details for your delivery address.</p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close address form" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="address-label" className="mb-1.5 block text-sm font-medium text-slate-800">Address type</label>
                <select id="address-label" autoFocus value={label} onChange={(event) => setLabel(event.target.value)} className={fieldClass}>
                  <option>Home</option><option>Work</option><option>Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="address-recipient" className="mb-1.5 block text-sm font-medium text-slate-800">Recipient name</label>
                <input id="address-recipient" autoComplete="off" value={recipient} onChange={(event) => setRecipient(event.target.value)} required className={fieldClass} />
              </div>
              <div>
                <label htmlFor="address-phone" className="mb-1.5 block text-sm font-medium text-slate-800">Phone number <span className="font-normal text-slate-500">(optional)</span></label>
                <input id="address-phone" type="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="address-text" className="mb-1.5 block text-sm font-medium text-slate-800">Delivery address</label>
                <textarea id="address-text" rows={3} autoComplete="off" value={address} onChange={(event) => setAddress(event.target.value)} required className={`${fieldClass} h-auto min-h-24 py-3`} />
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-900 focus:ring-brand-700" />
                Set as default address
              </label>
              {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className={primaryButtonClass}>Save address</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-address-heading" aria-describedby="delete-address-description" onKeyDown={(event) => { if (event.key === 'Escape') setPendingDelete(null); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="delete-address-heading" className="text-lg font-bold text-slate-950">Delete this address?</h2>
            <p id="delete-address-description" className="mt-2 break-words text-sm leading-6 text-slate-600">“{pendingDelete.label}” will be removed from your saved addresses.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" autoFocus onClick={() => setPendingDelete(null)} className="btn-secondary">Keep address</button>
              <button type="button" onClick={confirmDelete} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2">Delete address</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
