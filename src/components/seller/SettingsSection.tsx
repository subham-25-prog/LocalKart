'use client';

import React, { useEffect, useState } from 'react';
import { Camera, Clock, CreditCard, MapPin, Save, ShieldCheck, Store } from 'lucide-react';
import { toast } from '@/lib/toast';
import { loadStoreProfile, saveStoreProfile, StoreProfile } from '@/lib/sellerProfile';

const DEFAULT_PROFILE: StoreProfile = {
  name: 'Sri Krishna Dairy & Provisions',
  handle: 'krishna-dairy',
  description: 'Daily dairy, pantry staples, and fast local delivery from Indiranagar.',
  logo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=200&h=200&fit=crop',
  banner: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  phone: '+91 98450 12345',
  address: 'No 12, 12th Main Rd, Doopanahalli, Indiranagar, Bengaluru',
  pickupLocation: 'Back gate pickup counter, 12th Main Road',
  businessCategory: 'Dairy & Grocery',
  upiDetails: 'krishnadairy@upi',
  bankDetails: 'HDFC Bank **** 4231',
  gstNumber: '',
  socialLinks: '@krishnadairyblr',
  openTime: '06:00 AM',
  closeTime: '09:30 PM',
  isOpen: true,
  tags: 'Dairy, Grocery, Provisions'
};

export default function SettingsSection() {
  const [profile, setProfile] = useState<StoreProfile>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const logoRef = React.useRef<HTMLInputElement>(null);
  const bannerRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProfile({ ...DEFAULT_PROFILE, ...(loadStoreProfile() || {}) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = (patch: Partial<StoreProfile>) => setProfile((current) => ({ ...current, ...patch }));

  const handleImage = (file: File | undefined, key: 'logo' | 'banner') => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast('Image must be under 6MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update({ [key]: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!profile.name.trim() || !profile.phone.trim() || !profile.address.trim()) {
      toast('Store name, phone, and address are required');
      return;
    }
    setSaving(true);
    saveStoreProfile({
      ...profile,
      handle: profile.handle.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      address: profile.address.trim()
    });
    setTimeout(() => {
      setSaving(false);
      toast('Store settings saved');
    }, 350);
  };

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div
          className="relative h-40 bg-zinc-900"
          style={{
            background: profile.banner.startsWith('data:') || profile.banner.startsWith('http') ? undefined : profile.banner
          }}
        >
          {(profile.banner.startsWith('data:') || profile.banner.startsWith('http')) && (
            <img src={profile.banner} alt="Store banner" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 to-transparent" />
          <button
            onClick={() => bannerRef.current?.click()}
            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-xs font-bold text-white backdrop-blur"
          >
            <Camera className="h-4 w-4" />
            Banner
          </button>
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImage(event.target.files?.[0], 'banner')} />
          <div className="absolute bottom-4 left-4 flex items-end gap-3">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-zinc-950 bg-zinc-900 shadow-xl">
              <img src={profile.logo} alt={profile.name} className="h-full w-full object-cover" />
              <button onClick={() => logoRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImage(event.target.files?.[0], 'logo')} />
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{profile.name}</h1>
                <ShieldCheck className="h-4 w-4 text-orange-400" />
              </div>
              <p className="text-xs font-bold text-zinc-300">@{profile.handle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={<Store className="h-4 w-4" />} title="Store identity">
          <SellerInput label="Store name" value={profile.name} onChange={(name) => update({ name })} />
          <SellerInput label="Store handle" value={profile.handle} onChange={(handle) => update({ handle })} />
          <SellerInput label="Business category" value={profile.businessCategory} onChange={(businessCategory) => update({ businessCategory })} />
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
            Description
            <textarea
              value={profile.description}
              onChange={(event) => update({ description: event.target.value })}
              rows={4}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm normal-case text-zinc-100 outline-none focus:border-orange-500"
            />
          </label>
        </Panel>

        <Panel icon={<MapPin className="h-4 w-4" />} title="Contact and pickup">
          <SellerInput label="Phone" value={profile.phone} onChange={(phone) => update({ phone })} />
          <SellerInput label="Store address" value={profile.address} onChange={(address) => update({ address })} />
          <SellerInput label="Pickup counter" value={profile.pickupLocation} onChange={(pickupLocation) => update({ pickupLocation })} />
          <SellerInput label="Social link" value={profile.socialLinks || ''} onChange={(socialLinks) => update({ socialLinks })} />
        </Panel>

        <Panel icon={<Clock className="h-4 w-4" />} title="Operations">
          <div className="grid grid-cols-2 gap-3">
            <SellerInput label="Open time" value={profile.openTime} onChange={(openTime) => update({ openTime })} />
            <SellerInput label="Close time" value={profile.closeTime} onChange={(closeTime) => update({ closeTime })} />
          </div>
          <SellerInput label="Tags" value={profile.tags} onChange={(tags) => update({ tags })} />
          <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <span>
              <span className="block text-sm font-bold text-zinc-100">Accepting orders</span>
              <span className="block text-xs text-zinc-500">Customers see your store as open</span>
            </span>
            <button
              type="button"
              onClick={() => update({ isOpen: !profile.isOpen })}
              className={`h-7 w-12 rounded-full p-0.5 transition ${profile.isOpen ? 'bg-orange-500' : 'bg-zinc-700'}`}
            >
              <span className={`block h-6 w-6 rounded-full bg-white transition ${profile.isOpen ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </Panel>

        <Panel icon={<CreditCard className="h-4 w-4" />} title="Payments">
          <SellerInput label="UPI ID" value={profile.upiDetails} onChange={(upiDetails) => update({ upiDetails })} />
          <SellerInput label="Bank details" value={profile.bankDetails} onChange={(bankDetails) => update({ bankDetails })} />
          <SellerInput label="GST number" value={profile.gstNumber || ''} onChange={(gstNumber) => update({ gstNumber })} />
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium leading-relaxed text-emerald-300">
            Settlement routing is saved locally for this build and can be connected to payout APIs later.
          </div>
        </Panel>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-sm font-black uppercase text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save Store Settings'}
      </button>
    </section>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-orange-400">{icon}</span>
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SellerInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm normal-case text-zinc-100 outline-none focus:border-orange-500"
      />
    </label>
  );
}
