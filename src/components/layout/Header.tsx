'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MapPin, Search, ChevronDown, Check, Store, User, ShoppingBag, Settings, HelpCircle, LogOut, Mail, Phone, Trash2, Bell, CheckCircle, Loader2, Navigation, UserCheck } from 'lucide-react';
import { clearSession, getStoredUser, setSession, SESSION_EVENT } from '@/lib/auth';
import { toast } from '@/lib/toast';

export const LOCATIONS = [
  { name: 'Indiranagar Central', lat: 12.9716, lng: 77.6400, desc: 'Metro station & 100ft road' },
  { name: 'Sri Krishna Dairy Area', lat: 12.9702, lng: 77.6368, desc: 'Doopanahalli & 12th Main' },
  { name: 'CMH Road Metro', lat: 12.9785, lng: 77.6385, desc: 'Quick Meds & local shopping' },
  { name: 'Domlur Layout', lat: 12.9610, lng: 77.6355, desc: 'Organic Harvest & corporate park' },
];

const MOCK_ORDERS = [
  {
    id: 'LK-9382',
    date: 'May 22, 2026',
    storeName: 'Sri Krishna Dairy & Provisions',
    items: '2x Amul Taaza Fresh Milk (1L), 1x English Oven Brown Bread',
    total: 100.0,
    status: 'Delivered',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    id: 'LK-8471',
    date: 'May 18, 2026',
    storeName: 'Fresh Mart Supermarket',
    items: '1x India Gate Basmati Rice (1kg), 12x Farm Fresh White Eggs',
    total: 194.0,
    status: 'Delivered',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    id: 'LK-7362',
    date: 'May 10, 2026',
    storeName: 'Alpha Electronics',
    items: '1x Anker PowerPort 20W USB-C Fast Charger',
    total: 1399.0,
    status: 'Returned',
    color: 'text-gray-500 bg-gray-50 border-gray-100',
  },
];

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedLoc, setSelectedLoc] = useState(LOCATIONS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isLocalEnv, setIsLocalEnv] = useState(false);

  // Detect local environment context on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || 
                      hostname === '127.0.0.1' || 
                      hostname.startsWith('192.168.') || 
                      hostname.startsWith('10.') || 
                      hostname.endsWith('.local');
      setIsLocalEnv(isLocal);
    }
  }, [searchParams]);

  const fetchIPGeolocation = async () => {
    // 1. Try freeipapi.com (extremely fast, free, HTTPS, high rate limits, CORS enabled)
    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude !== undefined && data.longitude !== undefined) {
          return {
            name: `${data.cityName || 'Detected Location'}, ${data.regionName || data.countryName || 'India'}`,
            lat: data.latitude,
            lng: data.longitude,
            desc: `IP Geolocation (freeipapi)`
          };
        }
      }
    } catch (e) {
      console.warn("freeipapi fallback failed, trying ipapi.co...", e);
    }

    // 2. Try ipapi.co as secondary fallback
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude !== undefined && data.longitude !== undefined) {
          return {
            name: `${data.city || 'Detected Location'}, ${data.region_code || 'India'}`,
            lat: data.latitude,
            lng: data.longitude,
            desc: `IP Geolocation (ipapi)`
          };
        }
      }
    } catch (e) {
      console.warn("ipapi.co failed...", e);
    }

    return null;
  };

  const triggerIPOnlyGeolocation = async () => {
    setIsLocating(true);
    try {
      const ipLoc = await fetchIPGeolocation();
      if (ipLoc) {
        setSelectedLoc(ipLoc);
        localStorage.setItem('localkart_location', JSON.stringify(ipLoc));
        window.dispatchEvent(new CustomEvent('localkart_location_changed', { detail: ipLoc }));
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert("Unable to resolve your location via IP. Please choose a location from the list or search manually.");
        if (!localStorage.getItem('localkart_location')) {
          handleLocationSelect(LOCATIONS[0]);
        }
      }
    } catch (err) {
      console.error("Force IP Geolocation failed:", err);
    }
    setIsLocating(false);
  };

  const triggerGeolocation = () => {
    if (typeof window === 'undefined') return;

    setIsLocating(true);

    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser. Falling back to IP Geolocation immediately...");
      triggerIPOnlyGeolocation();
      return;
    }

    // Adjusted high accuracy timeout to 8000ms to allow desktops time to resolve Wi-Fi locations
    const optionsHigh = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
    const optionsLow = { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 };

    const successCallback = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      let locationName = "Current Location";
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (apiKey) {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const addressComponents = data.results[0].address_components;
            const neighborhood = addressComponents.find((c: any) => c.types.includes("neighborhood") || c.types.includes("sublocality"));
            const city = addressComponents.find((c: any) => c.types.includes("locality"));
            if (neighborhood && city) {
              locationName = `${neighborhood.long_name}, ${city.long_name}`;
            } else {
              locationName = data.results[0].formatted_address.split(',')[0] || "Detected Area";
            }
          }
        } catch (e) {
          console.error("Geocoding failed:", e);
        }
      } else {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          });
          const data = await res.json();
          if (data.address) {
            const suburb = data.address.suburb || data.address.neighbourhood || data.address.village || data.address.subdivision;
            const city = data.address.city || data.address.town || data.address.county;
            if (suburb && city) {
              locationName = `${suburb}, ${city}`;
            } else {
              locationName = data.display_name.split(',')[0] || "Detected Location";
            }
          }
        } catch (e) {
          console.error("OSM Geocoding failed:", e);
          locationName = `Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;
        }
      }

      const newLoc = { name: locationName, lat: latitude, lng: longitude, desc: "Detected via Geolocation" };
      setSelectedLoc(newLoc);
      localStorage.setItem('localkart_location', JSON.stringify(newLoc));
      
      window.dispatchEvent(new CustomEvent('localkart_location_changed', { detail: newLoc }));
      setIsLocating(false);
      setIsModalOpen(false);
      router.refresh();
    };

    // Try high accuracy first, fallback to low accuracy, then fall back to chained IP geolocation
    navigator.geolocation.getCurrentPosition(
      successCallback,
      (error) => {
        console.warn("High accuracy geolocation failed, trying low accuracy fallback...", error);
        navigator.geolocation.getCurrentPosition(
          successCallback,
          async (err) => {
            console.error("Low accuracy geolocation also failed. Falling back to IP-based Geolocation...", err);
            
            try {
              const ipLoc = await fetchIPGeolocation();
              if (ipLoc) {
                setSelectedLoc(ipLoc);
                localStorage.setItem('localkart_location', JSON.stringify(ipLoc));
                window.dispatchEvent(new CustomEvent('localkart_location_changed', { detail: ipLoc }));
                setIsModalOpen(false);
                router.refresh();
              } else {
                if (!localStorage.getItem('localkart_location')) {
                  handleLocationSelect(LOCATIONS[0]);
                }
              }
            } catch (ipErr) {
              console.error("IP Geolocation fallback failed:", ipErr);
              if (!localStorage.getItem('localkart_location')) {
                handleLocationSelect(LOCATIONS[0]);
              }
            }
            setIsLocating(false);
          },
          optionsLow
        );
      },
      optionsHigh
    );
  };

  const handleManualLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearchQuery.trim()) return;

    setIsSearchingLocation(true);
    const query = manualSearchQuery.trim();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (apiKey) {
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const newLoc = {
            name: result.formatted_address.split(',')[0] || "Custom Search",
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            desc: result.formatted_address
          };
          handleLocationSelect(newLoc);
          setManualSearchQuery('');
        } else {
          alert('Location not found. Try a different city or area!');
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
          headers: { 'Accept-Language': 'en' }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          const result = data[0];
          const newLoc = {
            name: result.display_name.split(',')[0] || "Custom Search",
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            desc: result.display_name
          };
          handleLocationSelect(newLoc);
          setManualSearchQuery('');
        } else {
          alert('Location not found. Try a different city or area!');
        }
      } catch (err) {
        console.error(err);
      }
    }
    setIsSearchingLocation(false);
  };

  // Load local telemetry & sync states on client-side mount (resolves SSR hydration issues)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Load active location preference
    const savedLoc = localStorage.getItem('localkart_location');
    if (savedLoc) {
      try {
        setSelectedLoc(JSON.parse(savedLoc));
      } catch (e) {
        console.error(e);
      }
    } else {
      triggerGeolocation();
    }

    // 2. Load active user profile preference
    const syncUser = () => {
      const parsed = getStoredUser();
      setUser(parsed as any);
      setEditName(parsed?.name || '');
      setEditEmail(parsed?.email || '');
      setEditPhone(parsed?.phone || '');
    };

    syncUser();

    // 2.5. Check if redirect from protected page requires auto-triggering the sign-in modal
    if (localStorage.getItem('localkart_trigger_login') === 'true') {
      localStorage.removeItem('localkart_trigger_login');
      setIsLoginOpen(true);
      setLoginRole('seller');
    }

    const requestedLogin = searchParams.get('login');
    if (requestedLogin === 'seller' || requestedLogin === 'buyer') {
      setLoginRole(requestedLogin);
      setIsLoginOpen(true);
    }

    // 3. Listen to local storage updates from other pages
    window.addEventListener(SESSION_EVENT, syncUser);
    return () => {
      window.removeEventListener(SESSION_EVENT, syncUser);
    };
  }, []);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // User Profile State
  const [user, setUser] = useState<{
    name: string;
    email: string;
    phone: string;
    membership: string;
    role?: 'buyer' | 'seller';
  } | null>(null);

  // Modal control states
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'profile' | 'orders' | 'settings' | 'support'>('profile');
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Form states
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'buyer' | 'seller'>('buyer');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Settings states
  const [settingsNotifEmail, setSettingsNotifEmail] = useState(true);
  const [settingsNotifSMS, setSettingsNotifSMS] = useState(false);
  const [settingsOffers, setSettingsOffers] = useState(true);

  // Support Form states
  const [supportSubject, setSupportSubject] = useState('Order Issue');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSupportSubmitted, setIsSupportSubmitted] = useState(false);

  // Helper to extract initials
  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  // Sync state with localStorage on mount
  useEffect(() => {
    // Set search query input value if present in URL
    const query = searchParams.get('q') || '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(query);

    if (typeof window !== 'undefined') {
      const savedUsers = localStorage.getItem('localkart_registered_users');
      if (!savedUsers) {
        localStorage.setItem('localkart_registered_users', JSON.stringify([]));
      }
    }
  }, [searchParams]);

  const handleLocationSelect = (loc: typeof LOCATIONS[0]) => {
    setSelectedLoc(loc);
    localStorage.setItem('localkart_location', JSON.stringify({ name: loc.name, lat: loc.lat, lng: loc.lng }));
    setIsModalOpen(false);
    
    // Dispatch global custom event for sibling coordinate recalculation
    window.dispatchEvent(new CustomEvent('localkart_location_changed', { detail: loc }));

    // Reload active page to fetch new distances
    router.refresh();
  };

  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };

  if (pathname && pathname.startsWith('/seller')) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 shadow-sm transition-premium">
        {/* Top Navbar */}
        <div className="px-4 py-3 mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 text-zinc-50 border border-zinc-800 text-base font-extrabold transition-premium group-hover:scale-102">
                LK
              </div>
              <span className="text-base font-bold tracking-tight text-zinc-50 hidden sm:inline-block">
                Local<span className="text-orange-500">Kart</span>
              </span>
            </Link>

            {/* Location Selector */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-800 transition-premium text-left max-w-[180px] sm:max-w-[250px] shadow-sm"
            >
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-[8px] text-zinc-500 font-bold uppercase leading-none tracking-wider">Deliver to</p>
                <div className="flex items-center gap-0.5">
                  <span className="text-xs font-bold text-zinc-200 truncate leading-tight">
                    {selectedLoc.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </div>
              </div>
            </button>

            {/* Search Bar - Desktop Only */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl relative">
              <input
                type="text"
                placeholder="Search fresh milk, basmati rice, headphones, charger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-1.5 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 focus:bg-zinc-950 focus:outline-none focus:border-zinc-700 text-xs rounded-lg text-zinc-100 placeholder-zinc-500 transition-premium shadow-inner"
              />
              <button type="submit" className="absolute right-3 top-2 text-zinc-500 hover:text-orange-500">
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Right CTAs */}
            <div className="flex items-center gap-2.5 shrink-0 relative">
              <Link
                href="/map"
                className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-zinc-50 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800 transition shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Live Map
              </Link>

              <Link
                href="/deals"
                className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-zinc-50 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800 transition shadow-sm"
              >
                <span className="text-orange-500 font-extrabold text-[10px]">🔥</span>
                Local Deals
              </Link>
              
              {user ? (
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  aria-label="Toggle user profile menu"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-50 font-bold text-xs uppercase cursor-pointer transition-premium shadow-sm focus:outline-none"
                >
                  {getInitials(user.name)}
                </button>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="text-xs font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3.5 py-1.5 rounded-lg transition-premium"
                >
                  Sign In
                </button>
              )}

              {isProfileOpen && user && (
                <>
                  {/* Backdrop to close the dropdown */}
                  <div
                    className="fixed inset-0 z-[70] cursor-default"
                    onClick={() => setIsProfileOpen(false)}
                  />
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
                    {/* User Profile Header */}
                    <div className="p-4 bg-zinc-950 border-b border-zinc-900">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-50 font-bold text-xs uppercase border border-zinc-700 shadow-inner shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm tracking-tight text-white truncate">{user.name}</h4>
                          <p className="text-[10px] text-zinc-450 font-medium truncate">{user.email}</p>
                          <span className="inline-flex items-center mt-1 px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-full text-[8px] font-bold text-zinc-350 uppercase tracking-wider">
                            {user.membership}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Location Info */}
                    <div className="px-4 py-2 bg-zinc-950/50 border-b border-zinc-900 flex items-center justify-between text-[10px] text-zinc-400 font-semibold">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="truncate">{selectedLoc.name}</span>
                      </div>
                      <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[8px] font-extrabold shrink-0">
                        Verified
                      </span>
                    </div>

                    {/* Menu Options */}
                    <div className="p-2 space-y-0.5">
                      {user.role === 'seller' && (
                        <Link
                          href="/seller"
                          onClick={() => setIsProfileOpen(false)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-premium text-left"
                        >
                          <Store className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span>Go to Seller Portal</span>
                        </Link>
                      )}

                      <Link
                        href="/orders"
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-premium text-left"
                      >
                        <ShoppingBag className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span>My Orders</span>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-premium text-left"
                      >
                        <User className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span>My Profile</span>
                      </Link>

                    </div>

                    {/* Footer / Logout */}
                    <div className="p-2 border-t border-zinc-800 bg-zinc-950/40 flex gap-2">
                      <button
                        onClick={() => {
                          setUser(null);
                          setIsProfileOpen(false);
                          clearSession();
        toast('Logged out');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold bg-red-950/10 hover:bg-red-950/20 border border-red-900/20 text-red-400 rounded-lg transition-premium cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Search Bar - Mobile Only */}
          <form onSubmit={handleSearchSubmit} className="flex md:hidden mt-3 relative w-full">
            <input
              type="text"
              placeholder="Search products or stores near you..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-zinc-800 rounded-lg text-xs bg-zinc-900/40 focus:bg-zinc-950 focus:outline-none focus:border-zinc-750 transition-premium text-zinc-100 placeholder-zinc-500"
            />
            <button type="submit" className="absolute right-3 top-2 text-zinc-500 hover:text-orange-500 cursor-pointer">
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* Location Selection Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
            
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-zinc-950 text-white">
              <h3 className="font-bold text-base">Select Your Location</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white font-semibold text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Geolocation Button */}
            <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex flex-col gap-2.5">
              {isLocalEnv && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 animate-pulse-subtle">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      Local Dev Server Detected
                    </div>
                    <span className="text-[8px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-700 font-black uppercase">
                      Bypass Ready
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-650 font-semibold leading-normal">
                    Browsers restrict GPS geolocation on local insecure HTTP connections. Click below to bypass restrictions and immediately query your coordinates via our chained IP-based locator.
                  </p>
                  <button
                    onClick={triggerIPOnlyGeolocation}
                    disabled={isLocating}
                    className="w-full py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-200 hover:text-white font-extrabold text-[10px] rounded-lg transition duration-200 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                        Querying Secure IP Coordinates...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                        Force Live Location (IP Bypass)
                      </>
                    )}
                  </button>
                </div>
              )}

              <button
                onClick={triggerGeolocation}
                disabled={isLocating}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Detecting Real-Time Location...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Detect User's Live Geolocation
                  </>
                )}
              </button>

              <form onSubmit={handleManualLocationSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter custom city, address, or pin..."
                  value={manualSearchQuery}
                  onChange={(e) => setManualSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-zinc-955 font-medium bg-white"
                />
                <button
                  type="submit"
                  disabled={isSearchingLocation}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl transition flex items-center justify-center shrink-0"
                >
                  {isSearchingLocation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </button>
              </form>
            </div>

            <div className="p-4 bg-emerald-50/70 border-b border-emerald-100">
              <p className="text-xs text-emerald-800 leading-normal font-medium">
                Changing your location recalculates real-time store distances and sorts products by what is physically closest to you.
              </p>
            </div>

            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {LOCATIONS.map((loc) => {
                const isSelected = loc.name === selectedLoc.name;
                return (
                  <button
                    key={loc.name}
                    onClick={() => handleLocationSelect(loc)}
                    className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition text-left"
                  >
                    <MapPin className={`w-5 h-5 mt-0.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isSelected ? 'text-emerald-600' : 'text-gray-800'}`}>
                          {loc.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">{loc.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center flex flex-col items-center gap-1 justify-center">
              <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5 justify-center">
                <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                LOCALKART CO COORDINATES SIMULATOR v1.2
              </p>
              {isLocalEnv && (
                <span className="text-[8px] text-zinc-550 font-bold uppercase tracking-widest bg-zinc-200/50 px-2.5 py-0.5 rounded border border-zinc-300">
                  Telemetry Channel: Connected
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal Overlay */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-zinc-950 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500 text-white font-black text-sm tracking-tighter">
                  LK
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-white">LocalKart Account</h3>
                  <p className="text-[10px] text-zinc-400 font-medium">Hyperlocal provisions & delivery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLoginOpen(false);
                  setLoginError('');
                }}
                className="text-zinc-400 hover:text-white font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Amazon/Flipkart Inspired Card Body */}
            <div className="p-6 overflow-y-auto max-h-[85vh]">
              
              {/* Tab Selector: Login vs Register */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setLoginError('');
                  }}
                  className={`flex-1 pb-3 text-center text-xs font-bold transition-all border-b-2 ${
                    !isRegistering
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setLoginError('');
                  }}
                  className={`flex-1 pb-3 text-center text-xs font-bold transition-all border-b-2 ${
                    isRegistering
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Error Message Box */}
              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <span className="text-red-500 font-bold shrink-0">⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError('');

                  const emailKey = loginEmail.trim().toLowerCase();
                  if (!emailKey) {
                    setLoginError('Email address is required.');
                    return;
                  }
                  if (!loginPassword) {
                    setLoginError('Password is required.');
                    return;
                  }

                  try {
                    if (isRegistering) {
                      if (!loginName.trim()) {
                        setLoginError('Please enter your full name.');
                        return;
                      }

                      const res = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: loginName.trim(),
                          email: emailKey,
                          phone: loginPhone.trim(),
                          password: loginPassword,
                          role: loginRole
                        })
                      });

                      const data = await res.json();
                      if (!res.ok || !data.success) {
                        setLoginError(data.error || 'Registration failed. Please try again.');
                        return;
                      }

                      // Dynamic sync: Save local backup register too
                      const savedUsersRaw = localStorage.getItem('localkart_registered_users');
                      let registeredUsers = [];
                      if (savedUsersRaw) {
                        try { registeredUsers = JSON.parse(savedUsersRaw); } catch (err) {
                          console.warn('Failed to parse locally registered users backup:', err);
                        }
                      }
                      if (!registeredUsers.some((u: any) => u.email === emailKey)) {
                        registeredUsers.push({
                          name: loginName.trim(),
                          email: emailKey,
                          phone: loginPhone.trim() || '+91 98765 43210',
                          role: loginRole,
                          membership: data.user.membership
                        });
                        localStorage.setItem('localkart_registered_users', JSON.stringify(registeredUsers));
                      }

                      setSession(data.user as any, data.token);
                      setUser(data.user as any);
                      setEditName(data.user.name);
                      setEditEmail(data.user.email);
                      setEditPhone(data.user.phone || '');
                      setIsLoginOpen(false);
                      
                      if (data.user.role === 'seller') {
                        router.push('/seller');
                      } else {
                        router.push('/');
                      }
                    } else {
                      // Login flow
                      const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: emailKey,
                          password: loginPassword,
                          role: loginRole
                        })
                      });

                      const data = await res.json();
                      if (!res.ok || !data.success) {
                        setLoginError(data.error || 'Authentication failed. Please check credentials.');
                        return;
                      }

                      // Save user profile state
                      setSession(data.user as any, data.token);
                      setUser(data.user as any);
                      setEditName(data.user.name);
                      setEditEmail(data.user.email);
                      setEditPhone(data.user.phone || '');
                      setIsLoginOpen(false);
                      
                      if (data.user.role === 'seller') {
                        router.push('/seller');
                      } else {
                        router.push('/');
                      }
                    }
                  } catch (err: any) {
                    console.error('Authentication request failed:', err);
                    
                    // Offline Fallback logic:
                    const savedUsersRaw = localStorage.getItem('localkart_registered_users');
                    let registeredUsers = [];
                    if (savedUsersRaw) {
                      try { registeredUsers = JSON.parse(savedUsersRaw); } catch (e) {
                        console.warn('Failed to parse locally registered users backup:', e);
                      }
                    }

                    if (isRegistering) {
                      if (registeredUsers.some((u: any) => u.email === emailKey)) {
                        setLoginError('An account with this email already exists.');
                        return;
                      }
                      const newUser = {
                        name: loginName.trim(),
                        email: emailKey,
                        phone: loginPhone.trim() || '+91 98765 43210',
                        role: loginRole,
                        membership: loginRole === 'seller' ? 'Silver Merchant' : 'Silver Explorer'
                      };
                      registeredUsers.push(newUser);
                      localStorage.setItem('localkart_registered_users', JSON.stringify(registeredUsers));
                      setSession(newUser as any);
                      setUser(newUser as any);
                      setIsLoginOpen(false);
                      router.push(newUser.role === 'seller' ? '/seller' : '/');
                    } else {
                      const foundUser = registeredUsers.find((u: any) => u.email === emailKey && u.role === loginRole);
                      if (!foundUser) {
                        setLoginError('No account found. Server is offline — only registered accounts available.');
                        return;
                      }
                      setSession(foundUser as any);
                      setUser(foundUser as any);
                      setIsLoginOpen(false);
                      router.push(foundUser.role === 'seller' ? '/seller' : '/');
                    }
                  }
                }}
                className="space-y-4"
              >
                
                {/* Role Picker (Buyer vs Seller) */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">I want to sign in as a:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLoginRole('buyer')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        loginRole === 'buyer'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-700 shadow-xs font-bold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-500'
                      }`}
                    >
                      <span className="text-lg mb-1">🛒</span>
                      <span className="font-extrabold text-xs">Buyer</span>
                      <span className="text-[8px] text-gray-400 mt-0.5 leading-none">Shop local deals</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginRole('seller')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        loginRole === 'seller'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-700 shadow-xs font-bold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-500'
                      }`}
                    >
                      <span className="text-lg mb-1">🏪</span>
                      <span className="font-extrabold text-xs">Seller</span>
                      <span className="text-[8px] text-gray-400 mt-0.5 leading-none">Manage provisions</span>
                    </button>
                  </div>
                </div>

                {/* Registration Fields */}
                {isRegistering && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="Lokesh Kumar"
                          value={loginName}
                          onChange={(e) => setLoginName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Phone Number (Optional)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="lokesh.k@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Password</label>
                    {!isRegistering && (
                      <a href="#" onClick={(e) => { e.preventDefault(); alert('Please use the password you set during registration.'); }} className="text-[10px] text-orange-600 font-bold hover:underline">
                        Forgot Password?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs select-none">🔑</span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all duration-150 active:scale-[0.98] cursor-pointer text-center"
                  >
                    {isRegistering ? 'Create LocalKart Account' : 'Sign In & Continue'}
                  </button>
                </div>
              </form>

              {/* Informative Help Text */}
              <div className="mt-6 pt-4 border-t border-gray-150 text-[10px] text-gray-400 text-center leading-relaxed font-medium">
                By continuing, you agree to LocalKart's Conditions of Use and Privacy Notice.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Dashboard Modal Overlay */}
      {isDashboardOpen && user && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 flex flex-col md:flex-row h-[520px]">
            
            {/* Modal Sidebar (Tabs chooser) */}
            <div className="w-full md:w-52 bg-slate-50 border-r border-gray-100 flex flex-row md:flex-col p-2 md:p-4 gap-1.5 shrink-0 overflow-x-auto md:overflow-x-visible">
              
              {/* User badge in sidebar (Desktop only) */}
              <div className="hidden md:block pb-4 mb-4 border-b border-gray-200/60">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs uppercase shadow-sm">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-gray-900 truncate">{user.name}</p>
                    <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-[8px] font-extrabold text-emerald-800 uppercase rounded border border-emerald-100">
                      {user.membership}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveDashboardTab('profile');
                  setIsSupportSubmitted(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all w-full shrink-0 ${
                  activeDashboardTab === 'profile'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4 shrink-0 text-current" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  setActiveDashboardTab('orders');
                  setIsSupportSubmitted(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all w-full shrink-0 ${
                  activeDashboardTab === 'orders'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0 text-current" />
                <span>Order History</span>
              </button>

              <button
                onClick={() => {
                  setActiveDashboardTab('settings');
                  setIsSupportSubmitted(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all w-full shrink-0 ${
                  activeDashboardTab === 'settings'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0 text-current" />
                <span>Account Settings</span>
              </button>

              <button
                onClick={() => {
                  setActiveDashboardTab('support');
                  setIsSupportSubmitted(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all w-full shrink-0 ${
                  activeDashboardTab === 'support'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <HelpCircle className="w-4 h-4 shrink-0 text-current" />
                <span>Help & Support</span>
              </button>

              <div className="md:mt-auto pt-2 hidden md:block w-full">
                <button
                  onClick={() => {
                    setUser(null);
                    setIsDashboardOpen(false);
                    clearSession();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-650 hover:bg-red-50 rounded-lg transition text-left text-red-600"
                >
                  <LogOut className="w-4 h-4 shrink-0 text-current" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Modal Body & Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              
              {/* Modal Body Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base uppercase tracking-wider text-emerald-800">
                  {activeDashboardTab === 'profile' && 'Manage Profile'}
                  {activeDashboardTab === 'orders' && 'Order History'}
                  {activeDashboardTab === 'settings' && 'Account Settings'}
                  {activeDashboardTab === 'support' && 'Help & Support'}
                </h3>
                <button
                  onClick={() => {
                    setIsDashboardOpen(false);
                    setIsSupportSubmitted(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 font-semibold text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-50"
                >
                  ✕
                </button>
              </div>

              {/* Modal Tab Content Area */}
              <div className="p-6 flex-1 overflow-y-auto min-w-0">
                
                {/* Profile Tab */}
                {activeDashboardTab === 'profile' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!editName.trim() || !editEmail.trim()) {
                        alert('Name and Email are required.');
                        return;
                      }
                      const updatedUser = {
                        ...user,
                        name: editName.trim(),
                        email: editEmail.trim(),
                        phone: editPhone.trim(),
                      };
                      setSession(updatedUser as any);
                      setUser(updatedUser);
                      alert('Profile saved successfully!');
                    }}
                    className="space-y-4 max-w-md"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Email Address</label>
                      <input
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Phone Number</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 block">Membership Tier</label>
                      <span className="inline-block text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 mt-1">
                        🏆 {user.membership}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium leading-relaxed">Your tier updates automatically based on hyper-local order counts.</p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                )}

                {/* Orders Tab */}
                {activeDashboardTab === 'orders' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider pb-1 border-b border-gray-100">
                      <span>Recent Orders</span>
                      <span>{MOCK_ORDERS.length} Orders</span>
                    </div>

                    <div className="space-y-3.5">
                      {MOCK_ORDERS.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-gray-900">{order.id}</span>
                              <span className="text-[11px] text-gray-400 font-semibold">{order.date}</span>
                            </div>
                            <h4 className="text-xs font-extrabold text-gray-800 truncate">{order.storeName}</h4>
                            <p className="text-[11px] text-gray-500 line-clamp-1 font-medium">{order.items}</p>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                            <span className="text-xs font-extrabold text-emerald-700">₹{order.total.toFixed(2)}</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${order.color}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeDashboardTab === 'settings' && (
                  <div className="space-y-6 max-w-md">
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Bell className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        Communication Preferences
                      </h4>

                      <label className="flex items-start gap-3 p-3 bg-slate-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-slate-100/60 transition">
                        <input
                          type="checkbox"
                          checked={settingsNotifEmail}
                          onChange={(e) => setSettingsNotifEmail(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-800">Email Notifications</p>
                          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Receive digital receipt copy and price alert digests.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-slate-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-slate-100/60 transition">
                        <input
                          type="checkbox"
                          checked={settingsNotifSMS}
                          onChange={(e) => setSettingsNotifSMS(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-800">SMS Transaction Details</p>
                          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Receive direct SMS updates for pickup coordination details.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-slate-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-slate-100/60 transition">
                        <input
                          type="checkbox"
                          checked={settingsOffers}
                          onChange={(e) => setSettingsOffers(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-800">Hyper-Local Promotion Campaigns</p>
                          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Discover discount coupons for neighboring shops within 2km.</p>
                        </div>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <h4 className="text-xs font-extrabold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Trash2 className="w-4.5 h-4.5 text-red-500 shrink-0" />
                        Danger Zone
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                        Clearing app data will remove your local session, saved cart, preferences, and saved locations.
                      </p>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all LocalKart application data?')) {
                            localStorage.clear();
                            setUser(null);
                            setIsDashboardOpen(false);
                            alert('All cached data successfully cleared. LocalKart state reloaded.');
                            window.location.reload();
                          }
                        }}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/50 rounded-lg text-xs font-bold transition"
                      >
                        Reset Application Cache
                      </button>
                    </div>
                  </div>
                )}

                {/* Support Tab */}
                {activeDashboardTab === 'support' && (
                  <div className="max-w-md space-y-4">
                    {isSupportSubmitted ? (
                      <div className="p-6 text-center bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <h4 className="font-extrabold text-sm text-emerald-800">Support Ticket Created</h4>
                        <p className="text-xs text-emerald-700 leading-normal font-medium">
                          Your ticket has been created. Support usually responds by email or SMS within 30 minutes.
                        </p>
                        <button
                          onClick={() => setIsSupportSubmitted(false)}
                          className="px-4 py-2 bg-white border border-emerald-250 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-50 transition"
                        >
                          Submit Another Ticket
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!supportMessage.trim()) {
                            alert('Please write a message.');
                            return;
                          }
                          setIsSupportSubmitted(true);
                          setSupportMessage('');
                        }}
                        className="space-y-4"
                      >
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                          Have questions regarding coordinate distance inaccuracies or store price synchronization errors? Raise a support request.
                        </p>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Issue Category</label>
                          <select
                            value={supportSubject}
                            onChange={(e) => setSupportSubject(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-800"
                          >
                            <option>Store Price Mismatch</option>
                            <option>Incorrect Store Location / Coordinates</option>
                            <option>Product In-Stock Level Discrepancy</option>
                            <option>Order History Issue</option>
                            <option>Partnership Request</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Describe the Issue</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Please provide details (e.g. store name, item name, coordinate differences)..."
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium leading-relaxed"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                          >
                            Submit Help Ticket
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
