'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useCustomerDemo } from '@/components/providers/CustomerDemoContext';
import { useAuth } from '@/context/auth-context';

const fieldClass = 'input-premium min-h-12 rounded-lg px-3 text-base';
const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-900 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2';

export function AccountProfile() {
  const { profile, updateProfile } = useCustomerDemo();
  const { user, updateUser } = useAuth();
  const fullName = user?.name || profile.name || 'Anonna Rahman';
  const emailAddress = user?.email || profile.email || 'anonna@anonnamart.com';
  const phoneNumber = user?.phone || profile.phone || '+880 1712-345678';
  const [name, setName] = useState(fullName);
  const [email, setEmail] = useState(emailAddress);
  const [phone, setPhone] = useState(phoneNumber);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (editing) return;
    setName(fullName);
    setEmail(emailAddress);
    setPhone(phoneNumber);
  }, [editing, fullName, emailAddress, phoneNumber]);

  const cancel = () => {
    setName(fullName);
    setEmail(emailAddress);
    setPhone(phoneNumber);
    setError('');
    setNotice('');
    setEditing(false);
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter your full name.');
      setNotice('');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address, or leave it blank.');
      setNotice('');
      return;
    }
    updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    if (user) updateUser({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    setError('');
    setNotice('Your profile has been updated.');
    setEditing(false);
  };

  return (
    <section
      className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7"
      aria-labelledby="profile-heading"
    >
      <p className="text-sm font-semibold text-emerald-800">Your details</p>
      <h1 id="profile-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        My profile
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Keep your contact details up to date for a smoother shopping experience.
      </p>

      {!editing ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Full name
            </p>
            <p className="mt-1 break-words text-sm font-medium text-slate-900">{fullName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email address
            </p>
            <p className="mt-1 break-all text-sm font-medium text-slate-900">{emailAddress}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phone number
            </p>
            <p className="mt-1 break-words text-sm font-medium text-slate-900">{phoneNumber}</p>
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => {
                setNotice('');
                setEditing(true);
              }}
              className={primaryButtonClass}
            >
              Edit profile
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="mt-6 max-w-xl space-y-5">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              Full name
            </label>
            <input
              id="profile-name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              Email address
            </label>
            <input
              id="profile-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="profile-phone"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              Phone number <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={fieldClass}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={primaryButtonClass}>
              Save changes
            </button>
            <button type="button" onClick={cancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}
      {notice && (
        <p role="status" className="bg-brand-50 text-brand-900 mt-5 rounded-lg p-3 text-sm">
          {notice}
        </p>
      )}
    </section>
  );
}
