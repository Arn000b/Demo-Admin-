import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Mail, User, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80'
];

export function ProfileEditModal() {
  const { profile, updateProfile, isProfileEditOpen, setIsProfileEditOpen } = useStore();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    role: profile.role,
    avatar: profile.avatar
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isProfileEditOpen) {
      setForm({
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar
      });
      setError('');
    }
  }, [isProfileEditOpen, profile]);

  if (!isProfileEditOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : profile.avatar;
      setForm(prev => ({ ...prev, avatar: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Enter a valid email address.');
      return;
    }

    updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role.trim() || 'Executive Admin',
      avatar: form.avatar || profile.avatar
    });

    setIsProfileEditOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm" onClick={() => setIsProfileEditOpen(false)} />

      <div className="relative z-10 w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl overflow-hidden animate-slide-down">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Profile</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">Edit account details</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsProfileEditOpen(false)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close profile editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative">
              <img
                src={form.avatar || profile.avatar}
                alt="Profile preview"
                className="h-24 w-24 rounded-[26px] object-cover ring-4 ring-gold-100 shadow-sm"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-gold-400 shadow-lg transition-transform hover:scale-105"
                aria-label="Upload profile picture"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex-1 w-full">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Profile photo</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, avatar }))}
                    className={`h-12 w-12 overflow-hidden rounded-2xl border-2 transition-all ${
                      form.avatar === avatar ? 'border-brand-900 shadow-md' : 'border-slate-200 hover:border-brand-300'
                    }`}
                    aria-label="Choose profile avatar"
                  >
                    <img src={avatar} alt="Preset avatar" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label htmlFor="profile-name" className="mb-1.5 block text-xs font-semibold text-slate-600">Full name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="profile-role" className="mb-1.5 block text-xs font-semibold text-slate-600">Role</label>
              <input
                id="profile-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                placeholder="Executive Admin"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="profile-email" className="mb-1.5 block text-xs font-semibold text-slate-600">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white"
                  placeholder="you@anonnamart.com"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setIsProfileEditOpen(false)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-900 px-4 py-2 text-sm font-bold text-gold-400 shadow-sm transition hover:bg-brand-800"
            >
              <Check className="w-4 h-4" />
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
