'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  Heart,
  KeyRound,
  Languages,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Palette,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
  Trash2,
  Truck,
  Type,
  User,
  UserCheck,
  WalletCards,
  X
} from 'lucide-react';
import { clearSession, getStoredUser, LocalKartRole, LocalKartUser, setSession } from '@/lib/auth';
import { toast } from '@/lib/toast';

type ProfileSettings = {
  darkMode: boolean;
  language: 'English' | 'Hindi' | 'Kannada' | 'Tamil';
  notifications: boolean;
  orderAlerts: boolean;
  marketing: boolean;
  appTheme: 'System' | 'Classic' | 'High contrast';
  fontSize: 'Compact' | 'Default' | 'Large';
  reduceMotion: boolean;
  twoFactor: boolean;
  privateProfile: boolean;
  blockedUsers: string[];
  appPermissions: {
    location: boolean;
    camera: boolean;
    notifications: boolean;
  };
};

type EditableProfile = {
  username: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  photo: string;
  verified: boolean;
};

type SellerSettings = {
  storeName: string;
  banner: string;
  paymentMethod: string;
  shipping: string;
  pickupAddress: string;
  businessDetails: string;
  gst: string;
};

type Sheet =
  | 'edit-profile'
  | 'username'
  | 'password'
  | 'email'
  | 'phone'
  | 'language'
  | 'theme'
  | 'font'
  | 'accessibility'
  | 'privacy'
  | 'blocked'
  | 'sessions'
  | 'devices'
  | 'permissions'
  | 'seller-store'
  | 'seller-banner'
  | 'seller-payments'
  | 'seller-shipping'
  | 'seller-pickup'
  | 'seller-business'
  | 'seller-tax'
  | 'help'
  | 'support'
  | 'report'
  | 'faq'
  | 'terms'
  | 'about'
  | null;

const SETTINGS_KEY = 'localkart_profile_settings';
const PROFILE_KEY = 'localkart_profile_details';
const SELLER_SETTINGS_KEY = 'localkart_profile_seller_settings';

const DEFAULT_SETTINGS: ProfileSettings = {
  darkMode: true,
  language: 'English',
  notifications: true,
  orderAlerts: true,
  marketing: false,
  appTheme: 'System',
  fontSize: 'Default',
  reduceMotion: false,
  twoFactor: false,
  privateProfile: false,
  blockedUsers: [],
  appPermissions: {
    location: true,
    camera: false,
    notifications: true
  }
};

const DEFAULT_SELLER: SellerSettings = {
  storeName: 'Krishna Provisions',
  banner: 'Fresh groceries, dairy, and home essentials delivered locally.',
  paymentMethod: 'UPI and cash on pickup',
  shipping: 'Local delivery within 3 km',
  pickupAddress: '12th Main Road, Indiranagar, Bengaluru',
  businessDetails: 'Registered neighborhood retail store',
  gst: ''
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    // Ensure parsed is an object before merging
    if (parsed && typeof parsed === 'object') {
      return { ...fallback, ...parsed };
    }
    return fallback;
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key "${key}" to localStorage:`, e);
    throw e;
  }
}

function makeDefaultProfile(user: LocalKartUser): EditableProfile {
  const username = user.email ? user.email.split('@')[0].replace(/[^a-z0-9._]/gi, '').toLowerCase() : 'localkart_user';
  return {
    username,
    name: user.name || 'LocalKart Customer',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.role === 'seller' ? 'Local seller on LocalKart.' : 'Shopping from trusted nearby stores.',
    photo: '/images/profile_photo.png',
    verified: user.role === 'seller'
  };
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border transition-colors duration-200 ${
        checked ? 'border-orange-500 bg-orange-500' : 'border-zinc-700 bg-zinc-800'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/80">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  title,
  subtitle,
  danger,
  onClick,
  trailing
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  const content = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-950 ${danger ? 'text-rose-500' : 'text-zinc-300'}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className={`block truncate text-sm font-bold ${danger ? 'text-rose-400' : 'text-zinc-100'}`}>{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-xs font-medium text-zinc-500">{subtitle}</span>}
      </span>
      <span className="ml-auto flex shrink-0 items-center justify-center">
        {trailing || <ChevronRight className="h-4 w-4 text-zinc-600" />}
      </span>
    </>
  );

  if (trailing && !onClick) {
    return (
      <div className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/55 active:bg-zinc-800"
    >
      {content}
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<LocalKartUser | null>(null);
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [draftProfile, setDraftProfile] = useState<EditableProfile | null>(null);
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);
  const [sellerSettings, setSellerSettings] = useState<SellerSettings>(DEFAULT_SELLER);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [passwordDraft, setPasswordDraft] = useState({ current: '', next: '', confirm: '' });
  const [photoZoom, setPhotoZoom] = useState(1);

  useEffect(() => {
    try {
      const storedUser = getStoredUser();
      setUser(storedUser);

      if (storedUser) {
        const loadedProfile = readJson(PROFILE_KEY, makeDefaultProfile(storedUser));
        const normalizedProfile = { ...makeDefaultProfile(storedUser), ...loadedProfile };
        setProfile(normalizedProfile);
        setDraftProfile(normalizedProfile);
        setSettings(readJson(SETTINGS_KEY, DEFAULT_SETTINGS));
        setSellerSettings(readJson(SELLER_SETTINGS_KEY, DEFAULT_SELLER));
      }
    } catch (e) {
      console.error('Error initializing profile page:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('profile-large-type', settings.fontSize === 'Large');
    document.documentElement.classList.toggle('profile-reduced-motion', settings.reduceMotion);
    document.documentElement.dataset.localkartTheme = settings.appTheme.toLowerCase().replace(/\s+/g, '-');
  }, [settings]);

  const isSeller = user?.role === 'seller';
  const stats = useMemo(() => {
    if (isSeller) return [{ label: 'Rating', value: '4.8' }, { label: 'Orders', value: '312' }, { label: 'Followers', value: '1.2k' }];
    return [{ label: 'Orders', value: '18' }, { label: 'Saved', value: '24' }, { label: 'Rating', value: '4.7' }];
  }, [isSeller]);

  const updateSettings = (patch: Partial<ProfileSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveJson(SETTINGS_KEY, next);
    toast('Setting saved');
  };

  const updatePermissions = (patch: Partial<ProfileSettings['appPermissions']>) => {
    const next = { ...settings, appPermissions: { ...settings.appPermissions, ...patch } };
    setSettings(next);
    saveJson(SETTINGS_KEY, next);
    toast('Permission updated');
  };

  const saveProfile = () => {
    if (!draftProfile || !user) return;
    if (!draftProfile.name.trim() || !draftProfile.username.trim()) {
      toast('Name and username are required');
      return;
    }

    const nextProfile = {
      ...draftProfile,
      username: draftProfile.username.trim().toLowerCase(),
      name: draftProfile.name.trim(),
      email: draftProfile.email.trim(),
      phone: draftProfile.phone.trim(),
      bio: draftProfile.bio.trim()
    };

    const nextUser: LocalKartUser = {
      ...user,
      name: nextProfile.name,
      email: nextProfile.email,
      phone: nextProfile.phone,
      role: user.role as LocalKartRole
    };

    try {
      saveJson(PROFILE_KEY, nextProfile);
      setSession(nextUser);
      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      setUser(nextUser);
      toast('Profile updated successfully');
      setSheet(null);
    } catch (err: any) {
      console.error('Profile save error:', err);
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        toast('Storage limit exceeded! Try using a smaller photo.');
      } else {
        toast('Failed to save profile. Please try again.');
      }
    }
  };



  const closeSheet = () => {
    if (sheet === 'edit-profile' && JSON.stringify(profile) !== JSON.stringify(draftProfile)) {
      const shouldClose = window.confirm('Discard unsaved profile changes?');
      if (!shouldClose) return;
      setDraftProfile(profile);
    }
    setSheet(null);
  };

  const handlePhotoUpload = (file: File | undefined) => {
    if (!file || !draftProfile) return;

    if (file.size > 10 * 1024 * 1024) {
      toast('Image is too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setDraftProfile({ ...draftProfile, photo: compressedDataUrl });
            setPhotoZoom(1);
          } catch (compressErr) {
            console.error('Failed to compress image:', compressErr);
            toast('Failed to process image. Please try another one.');
          }
        } else {
          setDraftProfile({ ...draftProfile, photo: String(reader.result) });
        }
      };
      img.onerror = () => {
        toast('Failed to load image file.');
      };
      img.src = String(e.target?.result);
    };
    reader.onerror = () => {
      toast('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Removed toggleRole as roles are fixed upon registration.

  const saveSellerSettings = (patch: Partial<SellerSettings>) => {
    const next = { ...sellerSettings, ...patch };
    setSellerSettings(next);
    saveJson(SELLER_SETTINGS_KEY, next);
    toast('Seller setting saved');
  };

  const submitPassword = () => {
    if (!passwordDraft.current || passwordDraft.next.length < 8 || passwordDraft.next !== passwordDraft.confirm) {
      toast('Use 8+ characters and make sure passwords match');
      return;
    }
    localStorage.setItem('localkart_password_updated_at', new Date().toISOString());
    setPasswordDraft({ current: '', next: '', confirm: '' });
    toast('Password updated');
    setSheet(null);
  };

  const submitSupport = (type: 'support' | 'report') => {
    const message = type === 'support' ? supportMessage : reportMessage;
    if (!message.trim()) {
      toast('Please describe the issue');
      return;
    }
    const key = type === 'support' ? 'localkart_support_tickets' : 'localkart_problem_reports';
    const existing = readJson<Array<{ id: string; message: string; createdAt: string }>>(key, []);
    saveJson(key, [{ id: `LK-${Date.now()}`, message: message.trim(), createdAt: new Date().toISOString() }, ...existing]);
    if (type === 'support') setSupportMessage('');
    else setReportMessage('');
    toast(type === 'support' ? 'Support request sent' : 'Problem report sent');
    setSheet(null);
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-orange-500" />
      </div>
    );
  }

  if (!user || !profile || !draftProfile) {
    return (
      <div className="min-h-[70vh] px-4 pb-24">
        <header className="sticky top-0 z-30 -mx-3 mb-8 flex items-center gap-3 border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur-md">
          <Link href="/" className="rounded-full p-2 hover:bg-zinc-900">
            <ArrowLeft className="h-5 w-5 text-zinc-100" />
          </Link>
          <h1 className="text-lg font-bold text-zinc-50">Profile</h1>
        </header>
        <div className="mx-auto flex max-w-sm flex-col items-center justify-center pt-16 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900">
            <User className="h-10 w-10 text-zinc-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-100">Welcome to LocalKart</h2>
          <p className="mb-8 text-sm text-zinc-400">Sign in to manage your profile, settings, orders, and saved items.</p>
          <button
            onClick={() => router.push('/login?callbackUrl=/profile')}
            className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
          >
            Log In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <header className="sticky top-0 z-30 -mx-3 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur-md sm:-mx-5 lg:-mx-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-zinc-900">
            <ArrowLeft className="h-5 w-5 text-zinc-100" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-zinc-50">Profile & Settings</h1>
            <p className="text-xs font-medium text-zinc-500">@{profile.username}</p>
          </div>
        </div>
        <button onClick={() => setSheet('edit-profile')} className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-900">
          Edit
        </button>
      </header>

      <main className="space-y-6 py-4">
        {/* Profile Action CTA Banner */}
        {isSeller ? (
          <div className="overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400">Merchant Account Active</span>
                </div>
                <h3 className="text-sm font-black text-zinc-100">Access your Seller Dashboard</h3>
                <p className="text-xs font-medium text-zinc-450 leading-relaxed">
                  Manage your store catalog, list new items, scan product barcodes, customize your pickup address, and fulfill customers orders from Indiranagar.
                </p>
              </div>
              <Link
                href="/seller"
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Store className="h-4 w-4" />
                Go to Seller Portal
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Buyer Account Active</span>
                </div>
                <h3 className="text-sm font-black text-zinc-100">Find products in Indiranagar</h3>
                <p className="text-xs font-medium text-zinc-455 leading-relaxed">
                  Discover fresh food provisions, dairy essentials, electronic accessories, and deals from verified stores in CMH Road and Domlur.
                </p>
              </div>
              <Link
                href="/"
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-950">
              <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black text-zinc-50">{profile.name}</h2>
                {profile.verified && <ShieldCheck className="h-4 w-4 text-sky-400" />}
                {isSeller && <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-orange-400">Seller</span>}
              </div>
              <p className="text-sm font-semibold text-zinc-400">@{profile.username}</p>
              <p className="mt-1 truncate text-xs text-zinc-500">{profile.email || profile.phone || 'No contact added'}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{profile.bio}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/70 py-3">
            {stats.map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-base font-black text-zinc-50">{item.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <Section title="Account">
          <Row icon={<UserCheck className="h-4 w-4" />} title="Edit Profile" subtitle="Photo, bio, display name" onClick={() => setSheet('edit-profile')} />
          <Row icon={<User className="h-4 w-4" />} title="Change Username" subtitle={`@${profile.username}`} onClick={() => setSheet('username')} />
          <Row icon={<KeyRound className="h-4 w-4" />} title="Change Password" subtitle="Last updated locally" onClick={() => setSheet('password')} />
          <Row icon={<Mail className="h-4 w-4" />} title="Email Settings" subtitle={profile.email || 'Add email'} onClick={() => setSheet('email')} />
          <Row icon={<Phone className="h-4 w-4" />} title="Phone Number" subtitle={profile.phone || 'Add phone'} onClick={() => setSheet('phone')} />
          <Row
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Two-factor Authentication"
            subtitle={settings.twoFactor ? 'Enabled' : 'Recommended for account safety'}
            trailing={<Toggle checked={settings.twoFactor} label="Two-factor Authentication" onChange={(twoFactor) => updateSettings({ twoFactor })} />}
          />
          <Row icon={<Trash2 className="h-4 w-4" />} title="Delete Account" subtitle="Remove local profile and session" danger onClick={() => {
            if (window.confirm('Delete your LocalKart account data from this device?')) clearSession(true);
          }} />
        </Section>

        <Section title="App Preferences">
          <Row icon={<Moon className="h-4 w-4" />} title="Dark Mode" subtitle={settings.darkMode ? 'On' : 'Off'} trailing={<Toggle checked={settings.darkMode} label="Dark Mode" onChange={(darkMode) => updateSettings({ darkMode })} />} />
          <Row icon={<Languages className="h-4 w-4" />} title="Language" subtitle={settings.language} onClick={() => setSheet('language')} />
          <Row icon={<Bell className="h-4 w-4" />} title="Notifications" subtitle={settings.notifications ? 'Order and account alerts enabled' : 'Muted'} trailing={<Toggle checked={settings.notifications} label="Notifications" onChange={(notifications) => updateSettings({ notifications })} />} />
          <Row icon={<Palette className="h-4 w-4" />} title="App Theme" subtitle={settings.appTheme} onClick={() => setSheet('theme')} />
          <Row icon={<Type className="h-4 w-4" />} title="Font Size" subtitle={settings.fontSize} onClick={() => setSheet('font')} />
          <Row icon={<CircleHelp className="h-4 w-4" />} title="Accessibility" subtitle={settings.reduceMotion ? 'Reduced motion on' : 'Default motion'} onClick={() => setSheet('accessibility')} />
        </Section>

        {isSeller && (
          <Section title="Seller Settings">
            <Row icon={<Store className="h-4 w-4" />} title="Store Profile" subtitle={sellerSettings.storeName} onClick={() => setSheet('seller-store')} />
            <Row icon={<Camera className="h-4 w-4" />} title="Store Banner" subtitle="Description and banner copy" onClick={() => setSheet('seller-banner')} />
            <Row icon={<WalletCards className="h-4 w-4" />} title="Payment Methods" subtitle={sellerSettings.paymentMethod} onClick={() => setSheet('seller-payments')} />
            <Row icon={<Truck className="h-4 w-4" />} title="Shipping Settings" subtitle={sellerSettings.shipping} onClick={() => setSheet('seller-shipping')} />
            <Row icon={<MapPin className="h-4 w-4" />} title="Pickup Address" subtitle={sellerSettings.pickupAddress} onClick={() => setSheet('seller-pickup')} />
            <Row icon={<Building2 className="h-4 w-4" />} title="Business Details" subtitle={sellerSettings.businessDetails} onClick={() => setSheet('seller-business')} />
            <Row icon={<FileText className="h-4 w-4" />} title="Tax/GST Settings" subtitle={sellerSettings.gst || 'Not added'} onClick={() => setSheet('seller-tax')} />
          </Section>
        )}

        <Section title="Privacy & Security">
          <Row icon={<Lock className="h-4 w-4" />} title="Privacy Controls" subtitle={settings.privateProfile ? 'Private profile' : 'Standard visibility'} onClick={() => setSheet('privacy')} />
          <Row icon={<User className="h-4 w-4" />} title="Blocked Users" subtitle={`${settings.blockedUsers.length} blocked`} onClick={() => setSheet('blocked')} />
          <Row icon={<KeyRound className="h-4 w-4" />} title="Login Sessions" subtitle="This device is active" onClick={() => setSheet('sessions')} />
          <Row icon={<Smartphone className="h-4 w-4" />} title="Device Management" subtitle="Manage trusted devices" onClick={() => setSheet('devices')} />
          <Row icon={<ShieldCheck className="h-4 w-4" />} title="App Permissions" subtitle="Location, camera, notifications" onClick={() => setSheet('permissions')} />
        </Section>

        <Section title="Support">
          <Row icon={<CircleHelp className="h-4 w-4" />} title="Help Center" subtitle="Orders, payments, seller help" onClick={() => setSheet('help')} />
          <Row icon={<Mail className="h-4 w-4" />} title="Contact Support" subtitle="Get help from LocalKart" onClick={() => setSheet('support')} />
          <Row icon={<FileText className="h-4 w-4" />} title="Report Problem" subtitle="Tell us what went wrong" onClick={() => setSheet('report')} />
          <Row icon={<CircleHelp className="h-4 w-4" />} title="FAQ" subtitle="Common questions" onClick={() => setSheet('faq')} />
          <Row icon={<ShieldCheck className="h-4 w-4" />} title="Terms & Privacy Policy" subtitle="Legal and privacy details" onClick={() => setSheet('terms')} />
        </Section>

        <Section title="About">
          <Row icon={<ShoppingBag className="h-4 w-4" />} title="App Version" subtitle="LocalKart 0.1.0" onClick={() => setSheet('about')} />
          <Row icon={<Star className="h-4 w-4" />} title="Saved Items" subtitle="Products and stores you follow" onClick={() => router.push('/saved')} />
          <Row icon={<Heart className="h-4 w-4" />} title="Orders" subtitle="Track recent purchases" onClick={() => router.push('/orders')} />
        </Section>

        <button
          onClick={() => clearSession(true)}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 text-sm font-bold text-rose-400 transition hover:bg-rose-500/15"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </main>

      {sheet && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950 px-4 py-3">
              <button onClick={closeSheet} className="rounded-full p-2 hover:bg-zinc-900">
                <X className="h-5 w-5 text-zinc-300" />
              </button>
              <h3 className="min-w-0 truncate px-3 text-sm font-black uppercase tracking-wider text-zinc-100">{sheet.replace(/-/g, ' ')}</h3>
              <span className="w-9" />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {sheet === 'edit-profile' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-900">
                      <img src={draftProfile.photo} alt="Profile preview" className="h-full w-full object-cover" style={{ transform: `scale(${photoZoom})` }} />
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-900">
                      <Camera className="h-4 w-4" />
                      Change Photo
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
                    </label>
                    <label className="w-full max-w-xs text-xs font-bold text-zinc-500">
                      Crop zoom
                      <input type="range" min="1" max="1.8" step="0.05" value={photoZoom} onChange={(e) => setPhotoZoom(Number(e.target.value))} className="mt-2 w-full accent-orange-500" />
                    </label>
                  </div>
                  <ProfileInput label="Username" value={draftProfile.username} onChange={(username) => setDraftProfile({ ...draftProfile, username })} />
                  <ProfileInput label="Display Name" value={draftProfile.name} onChange={(name) => setDraftProfile({ ...draftProfile, name })} />
                  <ProfileInput label="Email" value={draftProfile.email} onChange={(email) => setDraftProfile({ ...draftProfile, email })} />
                  <ProfileInput label="Phone" value={draftProfile.phone} onChange={(phone) => setDraftProfile({ ...draftProfile, phone })} />
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Bio
                    <textarea value={draftProfile.bio} onChange={(e) => setDraftProfile({ ...draftProfile, bio: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-orange-500" />
                  </label>
                  <button onClick={saveProfile} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600">
                    Save Changes
                  </button>
                </div>
              )}

              {['username', 'email', 'phone'].includes(sheet) && (
                <div className="space-y-4">
                  <ProfileInput
                    label={sheet === 'username' ? 'Username' : sheet === 'email' ? 'Email Address' : 'Phone Number'}
                    value={sheet === 'username' ? draftProfile.username : sheet === 'email' ? draftProfile.email : draftProfile.phone}
                    onChange={(value) => setDraftProfile({ ...draftProfile, [sheet === 'username' ? 'username' : sheet]: value })}
                  />
                  <button onClick={saveProfile} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600">
                    Save
                  </button>
                </div>
              )}

              {sheet === 'password' && (
                <div className="space-y-3">
                  <ProfileInput label="Current Password" type="password" value={passwordDraft.current} onChange={(current) => setPasswordDraft({ ...passwordDraft, current })} />
                  <ProfileInput label="New Password" type="password" value={passwordDraft.next} onChange={(next) => setPasswordDraft({ ...passwordDraft, next })} />
                  <ProfileInput label="Confirm Password" type="password" value={passwordDraft.confirm} onChange={(confirm) => setPasswordDraft({ ...passwordDraft, confirm })} />
                  <button onClick={submitPassword} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600">Update Password</button>
                </div>
              )}

              {sheet === 'language' && <ChoiceList value={settings.language} options={['English', 'Hindi', 'Kannada', 'Tamil']} onSelect={(language) => updateSettings({ language: language as ProfileSettings['language'] })} />}
              {sheet === 'theme' && <ChoiceList value={settings.appTheme} options={['System', 'Classic', 'High contrast']} onSelect={(appTheme) => updateSettings({ appTheme: appTheme as ProfileSettings['appTheme'] })} />}
              {sheet === 'font' && <ChoiceList value={settings.fontSize} options={['Compact', 'Default', 'Large']} onSelect={(fontSize) => updateSettings({ fontSize: fontSize as ProfileSettings['fontSize'] })} />}

              {sheet === 'accessibility' && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800">
                  <Row icon={<Type className="h-4 w-4" />} title="Reduce Motion" subtitle="Limit animated transitions" trailing={<Toggle checked={settings.reduceMotion} label="Reduce Motion" onChange={(reduceMotion) => updateSettings({ reduceMotion })} />} />
                  <Row icon={<Bell className="h-4 w-4" />} title="Order Alerts" subtitle="Important delivery notifications" trailing={<Toggle checked={settings.orderAlerts} label="Order Alerts" onChange={(orderAlerts) => updateSettings({ orderAlerts })} />} />
                  <Row icon={<Mail className="h-4 w-4" />} title="Offers and Updates" subtitle="Marketing messages" trailing={<Toggle checked={settings.marketing} label="Offers and Updates" onChange={(marketing) => updateSettings({ marketing })} />} />
                </div>
              )}

              {sheet === 'privacy' && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800">
                  <Row icon={<Lock className="h-4 w-4" />} title="Private Profile" subtitle="Hide public activity from stores" trailing={<Toggle checked={settings.privateProfile} label="Private Profile" onChange={(privateProfile) => updateSettings({ privateProfile })} />} />
                  <Row icon={<ShieldCheck className="h-4 w-4" />} title="Two-factor Authentication" subtitle={settings.twoFactor ? 'Enabled' : 'Disabled'} trailing={<Toggle checked={settings.twoFactor} label="Two-factor Authentication" onChange={(twoFactor) => updateSettings({ twoFactor })} />} />
                </div>
              )}

              {sheet === 'blocked' && <InfoPanel title="Blocked users" body={settings.blockedUsers.length ? settings.blockedUsers.join(', ') : 'You have not blocked any users or stores.'} />}
              {sheet === 'sessions' && <InfoPanel title="Login sessions" body="This device is active. Signing out clears the local token and prevents access to protected pages." />}
              {sheet === 'devices' && <InfoPanel title="Trusted devices" body="Current browser is trusted for this local session. Use logout to revoke access." />}

              {sheet === 'permissions' && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800">
                  <Row icon={<MapPin className="h-4 w-4" />} title="Location" subtitle="Used for nearby shops" trailing={<Toggle checked={settings.appPermissions.location} label="Location Permission" onChange={(location) => updatePermissions({ location })} />} />
                  <Row icon={<Camera className="h-4 w-4" />} title="Camera" subtitle="Used for product scanner" trailing={<Toggle checked={settings.appPermissions.camera} label="Camera Permission" onChange={(camera) => updatePermissions({ camera })} />} />
                  <Row icon={<Bell className="h-4 w-4" />} title="Notifications" subtitle="Delivery and order updates" trailing={<Toggle checked={settings.appPermissions.notifications} label="Notification Permission" onChange={(notifications) => updatePermissions({ notifications })} />} />
                </div>
              )}

              {sheet?.startsWith('seller-') && <SellerSheet sheet={sheet} sellerSettings={sellerSettings} saveSellerSettings={saveSellerSettings} />}

              {sheet === 'help' && <InfoPanel title="Help Center" body="Find help for orders, refunds, payments, delivery issues, seller onboarding, catalog updates, and pickup coordination." />}
              {sheet === 'faq' && <InfoPanel title="FAQ" body="Orders can be tracked from Orders. Saved items sync locally. Seller settings appear only on seller accounts. Logout clears this device session." />}
              {sheet === 'terms' && <InfoPanel title="Terms & Privacy" body="LocalKart stores only local app state in this development build. Your profile settings stay on this device unless connected to a production backend." />}
              {sheet === 'about' && <InfoPanel title="LocalKart 0.1.0" body="Hyperlocal commerce for nearby stores. Includes account settings, seller controls, saved items, checkout, and order tracking." />}

              {sheet === 'support' && (
                <MessageForm label="How can we help?" value={supportMessage} onChange={setSupportMessage} onSubmit={() => submitSupport('support')} />
              )}
              {sheet === 'report' && (
                <MessageForm label="Describe the problem" value={reportMessage} onChange={setReportMessage} onSubmit={() => submitSupport('report')} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-orange-500"
      />
    </label>
  );
}

function ChoiceList({ value, options, onSelect }: { value: string; options: string[]; onSelect: (value: string) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800">
      {options.map((option) => (
        <button key={option} onClick={() => onSelect(option)} className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-bold text-zinc-100 hover:bg-zinc-800/60">
          {option}
          {value === option && <Check className="h-4 w-4 text-orange-500" />}
        </button>
      ))}
    </div>
  );
}

function InfoPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h4 className="text-sm font-black text-zinc-100">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function MessageForm({ label, value, onChange, onSubmit }: { label: string; value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
        {label}
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-orange-500" />
      </label>
      <button onClick={onSubmit} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600">Submit</button>
    </div>
  );
}

function SellerSheet({
  sheet,
  sellerSettings,
  saveSellerSettings
}: {
  sheet: Sheet;
  sellerSettings: SellerSettings;
  saveSellerSettings: (patch: Partial<SellerSettings>) => void;
}) {
  const map: Record<string, { label: string; key: keyof SellerSettings }> = {
    'seller-store': { label: 'Store Name', key: 'storeName' },
    'seller-banner': { label: 'Store Banner', key: 'banner' },
    'seller-payments': { label: 'Payment Methods', key: 'paymentMethod' },
    'seller-shipping': { label: 'Shipping Settings', key: 'shipping' },
    'seller-pickup': { label: 'Pickup Address', key: 'pickupAddress' },
    'seller-business': { label: 'Business Details', key: 'businessDetails' },
    'seller-tax': { label: 'Tax/GST Number', key: 'gst' }
  };
  const config = map[String(sheet)];
  const [value, setValue] = useState(config ? sellerSettings[config.key] : '');

  if (!config) return null;

  return (
    <div className="space-y-3">
      <ProfileInput label={config.label} value={value} onChange={setValue} />
      <button onClick={() => saveSellerSettings({ [config.key]: value })} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600">
        Save
      </button>
    </div>
  );
}
