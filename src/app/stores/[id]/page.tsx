'use client';
 
import React, { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthCheckout } from '@/lib/authGuard';
import {
  MapPin,
  Star,
  Clock,
  Phone,
  MessageCircle,
  ArrowLeft,
  CheckCircle,
  Search,
  PlusCircle,
  Share2,
  Calendar,
  Loader2,
  Heart,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  AlertTriangle
} from 'lucide-react';
import { calculateDistance } from '@/lib/geo';
import { STORES, PRODUCTS, STORE_PRODUCTS, REVIEWS } from '@/lib/mockData';
import { getCart, addToCart, updateCartQty, clearCart, Cart } from '@/lib/cart';
import { toast } from '@/lib/toast';
import StoreLocationMap from '@/components/StoreLocationMap';

interface Store {
  id: string;
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsapp?: string;
  rating: number;
  reviewsCount: number;
  logo: string;
  banner: string;
  description?: string;
  handle?: string;
  pickupLocation?: string;
  businessCategory?: string;
  socialLinks?: string;
  openTime: string;
  closeTime: string;
  verified: boolean;
}

interface Review {
  id: string;
  storeId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  brand: string;
  price: number;
  stockCount: number;
}

export default function StoreDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
const { handleCheckout } = useAuthCheckout();
  const resolvedParams = use(params);
  const { id } = resolvedParams;
 
  const [userLoc, setUserLoc] = useState({ lat: 12.9716, lng: 77.6400, name: 'Indiranagar Central' });
  const [store, setStore] = useState<Store | null>(null);
  const [distance, setDistance] = useState(0);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedStores, setSavedStores] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'about' | 'policies'>('products');

  // Shopping Cart State
  const [cart, setCart] = useState<Cart | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<any>(null);

  useEffect(() => {
    setCart(getCart());
    const handleCartSync = () => {
      setCart(getCart());
    };
    window.addEventListener('localkart_cart_updated', handleCartSync);
    return () => {
      window.removeEventListener('localkart_cart_updated', handleCartSync);
    };
  }, []);

  const handleAddClick = (e: React.MouseEvent, item: CatalogProduct) => {
    e.stopPropagation();
    if (!store) return;
    const res = addToCart(store.id, store.name, {
      id: item.id,
      name: item.name,
      price: item.price,
      brand: item.brand,
      image: item.image
    }, 1);

    if (res.storeMismatch) {
      setPendingItem({ ...item, storeId: store.id, storeName: store.name });
      setShowReplaceModal(true);
    }
  };

  const confirmReplaceBasket = () => {
    if (!pendingItem) return;
    clearCart();
    addToCart(pendingItem.storeId, pendingItem.storeName, {
      id: pendingItem.id,
      name: pendingItem.name,
      price: pendingItem.price,
      brand: pendingItem.brand,
      image: pendingItem.image
    }, 1);
    setShowReplaceModal(false);
    setPendingItem(null);
  };

  const handleQtyChange = (e: React.MouseEvent, productId: string, change: number, currentQty: number) => {
    e.stopPropagation();
    updateCartQty(productId, currentQty + change);
  };

  const toggleSaveStore = () => {
    let updated;
    if (savedStores.includes(id)) {
      updated = savedStores.filter((sId) => sId !== id);
    } else {
      updated = [...savedStores, id];
    }
    setSavedStores(updated);
    localStorage.setItem('localkart_saved_stores', JSON.stringify(updated));
  };

  // Checkout guard
  // Replaced custom checkout logic with centralized auth guard.


  // Load store profile, inventory, and calculated distance
  const loadStoreProfile = useCallback(async (lat: number, lng: number) => {
    setLoading(true);

    const loadSimulatedProfile = () => {
      let matchStore: Store | undefined = STORES.find((s) => s.id === id);
      if (!matchStore) {
        setStore(null);
        setLoading(false);
        return;
      }

      if (id === 'store-krishnadairy') {
        const savedProfile = localStorage.getItem('localkart_seller_store_profile');
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            matchStore = {
              ...matchStore,
              name: parsed.name || matchStore.name,
              type: parsed.businessCategory || parsed.tags || matchStore.type,
              logo: parsed.logo || matchStore.logo,
              banner: parsed.banner || matchStore.banner,
              description: parsed.description,
              handle: parsed.handle,
              pickupLocation: parsed.pickupLocation,
              businessCategory: parsed.businessCategory,
              socialLinks: parsed.socialLinks,
              phone: parsed.phone || matchStore.phone,
              address: parsed.address || matchStore.address,
              openTime: parsed.openTime || matchStore.openTime,
              closeTime: parsed.closeTime || matchStore.closeTime
            };
          } catch (e) {
            console.error(e);
          }
        }
      }

      setStore(matchStore);
      setDistance(calculateDistance(lat, lng, matchStore.latitude, matchStore.longitude));
      setReviews(REVIEWS.filter((r) => r.storeId === id));
      let storeCatalog = STORE_PRODUCTS.filter((sp) => sp.storeId === id && sp.isAvailable && sp.stockCount > 0).map((sp) => {
        const product = PRODUCTS.find((p) => p.id === sp.productId)!;
        return {
          ...product,
          price: sp.price,
          stockCount: sp.stockCount,
        };
      });

      if (id === 'store-krishnadairy') {
        const savedOverride = localStorage.getItem('localkart_seller_inventory');
        if (savedOverride) {
          try {
            const parsed = JSON.parse(savedOverride);
            storeCatalog = parsed.filter((item: any) => item.stockCount > 0).map((item: any) => ({
              id: item.productId,
              name: item.name,
              category: item.category,
              price: item.price,
              stockCount: item.stockCount,
              image: item.image,
              description: PRODUCTS.find((p) => p.id === item.productId)?.description || 'Fresh in-store provisions.',
              brand: PRODUCTS.find((p) => p.id === item.productId)?.brand || 'Local'
            }));
          } catch (e) {
            console.error(e);
          }
        }
      }

      setCatalog(storeCatalog);
      setLoading(false);
    };

    try {
      const savedMode = typeof window !== 'undefined' ? localStorage.getItem('localkart_db_override') || 'mock' : 'mock';
      const res = await fetch(`/api/stores/${id}?lat=${lat}&lng=${lng}&db_mode=${savedMode}`);
      const data = await res.json();
      if (data.success && data.store) {
        setStore({
          id: data.store.id,
          name: data.store.name,
          type: data.store.type,
          address: data.store.address,
          latitude: data.store.latitude,
          longitude: data.store.longitude,
          phone: data.store.phone,
          whatsapp: data.store.whatsapp,
          rating: data.store.rating,
          reviewsCount: data.reviews?.length || data.store.reviewsCount,
          logo: data.store.logo,
          banner: data.store.banner,
          openTime: data.store.openTime || '08:00 AM',
          closeTime: data.store.closeTime || '10:00 PM',
          verified: data.store.verified ?? true
        });
        setDistance(data.distance);
        setReviews(data.reviews || []);
        setCatalog(data.catalog || []);
      } else {
        loadSimulatedProfile();
      }
    } catch (e) {
      console.error("Backend store fetch failed, falling back to local simulation:", e);
      loadSimulatedProfile();
    }
    setLoading(false);
  }, [id]);

  // Sync state on coordinates or parameters change
  useEffect(() => {
    setTimeout(() => {
      let lat = 12.9716;
      let lng = 77.6400;

      if (typeof window !== 'undefined') {
        const savedLocation = localStorage.getItem('localkart_location');
        if (savedLocation) {
          try {
            const parsed = JSON.parse(savedLocation);
            lat = parsed.lat;
            lng = parsed.lng;
            setUserLoc(parsed);
          } catch (e) {
            console.error(e);
          }
        }

        const savedS = localStorage.getItem('localkart_saved_stores');
        if (savedS) {
          try {
            setSavedStores(JSON.parse(savedS));
          } catch (e) {
            console.error(e);
          }
        }
      }

      loadStoreProfile(lat, lng);
    }, 0);

    // Listener for location edits
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newLoc = customEvent.detail;
      setUserLoc(newLoc);
      loadStoreProfile(newLoc.lat, newLoc.lng);
    };

    window.addEventListener('localkart_location_changed', handleLocationChange);
    return () => {
      window.removeEventListener('localkart_location_changed', handleLocationChange);
    };
  }, [loadStoreProfile]);

  // Handle in-store catalog fuzzy search computed on the fly
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) {
      return catalog;
    }
    const query = searchQuery.toLowerCase().trim();
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [searchQuery, catalog]);

  const handleShareStore = () => {
    if (!store) return;
    if (navigator.share) {
      navigator.share({
        title: `${store.name} on LocalKart`,
        text: `Check out local products and prices at ${store.name} near you!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Store URL copied to clipboard! Send to your friends.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm font-semibold text-zinc-400">Opening store front...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="glass-card border-zinc-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 bg-zinc-950 text-zinc-400 border border-zinc-850 rounded-full flex items-center justify-center mx-auto">
          <MapPin className="w-8 h-8 text-zinc-550 animate-bounce" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">Store Not Found</h2>
          <p className="text-sm text-zinc-455 font-medium mt-1">
            This physical shop is not registered in our local system directory.
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-zinc-800 text-white font-bold text-xs rounded-xl shadow hover:bg-zinc-700 transition"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      
      {/* Back button and share */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl shadow hover:bg-zinc-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-350" />
          </button>
          <div className="text-xs text-zinc-455 font-medium">
            Stores / <span className="font-bold text-zinc-200">{store.name}</span>
          </div>
        </div>
        
        <button
          onClick={handleShareStore}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-950 rounded-xl border border-zinc-900 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer shadow"
        >
          <Share2 className="w-3.5 h-3.5 text-orange-550 shrink-0" />
          Share
        </button>
      </div>

      {/* Store Header Banner Layout */}
      <div className="glass-card rounded-3xl overflow-hidden relative border-zinc-900 shadow animate-slide-up">
        <div
          style={{ background: store.banner }}
          className="h-32 sm:h-44 w-full relative"
        />

        <div className="p-4 sm:p-6 pt-10 sm:pt-12 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          {/* Logo overlay */}
          <div className="absolute -top-12 left-4 sm:left-6 border-4 border-zinc-950 rounded-2xl overflow-hidden bg-zinc-950 shadow w-20 h-20 sm:w-24 sm:h-24 hover:scale-102 transition-transform">
            <img
              src={store.logo}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="space-y-1 mt-2 sm:mt-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-white">
                {store.name}
              </h1>
              {store.verified && (
                <div className="flex items-center gap-0.5 text-[8px] font-bold text-zinc-300 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded uppercase tracking-wider shadow">
                  <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  Verified
                </div>
              )}
            </div>
            
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              {store.type}{store.handle ? ` • @${store.handle}` : ''}
            </p>
            {store.description && (
              <p className="text-xs text-zinc-400 font-medium max-w-2xl leading-relaxed">
                {store.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-455 font-medium pt-2">
              <span className="flex items-center gap-1 text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                {distance.toFixed(1)} km from {userLoc.name}
              </span>
              <span className="flex items-center gap-0.5 text-amber-455 bg-zinc-950 border border-zinc-850 px-2.5 py-0.5 rounded-full shadow text-[10px] font-bold shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                {store.rating.toFixed(1)} ({store.reviewsCount} reviews)
              </span>
              <span className="flex items-center gap-1 text-zinc-500 bg-zinc-950 px-2.5 py-0.5 rounded-full border border-zinc-900">
                <Clock className="w-3.5 h-3.5 shrink-0 text-orange-550" />
                {store.openTime} - {store.closeTime}
              </span>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={toggleSaveStore}
              className={`p-3 border rounded-xl transition-all shadow cursor-pointer flex items-center justify-center ${
                savedStores.includes(id)
                  ? 'bg-red-500/10 border-red-900/20 text-red-400 hover:bg-red-500/20'
                  : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-red-500'
              }`}
              title={savedStores.includes(id) ? "Remove store from saved" : "Bookmark store"}
            >
              <Heart className={`w-4 h-4 transition-colors ${savedStores.includes(id) ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <a
              href={`tel:${store.phone.replace(/\s+/g, '')}`}
              className="flex-1 sm:flex-none py-2.5 px-4 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-350 hover:text-white hover:bg-zinc-900 transition-premium text-xs font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Phone className="w-4 h-4 shrink-0 text-zinc-500" />
              Call Store
            </a>
            {store.whatsapp && (
              <a
                href={`https://wa.me/${store.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none py-2.5 px-4 bg-zinc-950 border border-zinc-900 text-zinc-350 hover:text-white hover:bg-zinc-900 transition-premium text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <MessageCircle className="w-4 h-4 shrink-0 text-zinc-500" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-md border border-zinc-900 rounded-2xl p-1 flex overflow-x-auto">
        {[
          { id: 'products', label: 'Products' },
          { id: 'reviews', label: 'Reviews' },
          { id: 'about', label: 'About' },
          { id: 'policies', label: 'Policies' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid Layout: Left Column catalog list, Right Column address map */}
      {activeTab === 'products' && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Product catalog inside store */}
        <div className="md:col-span-2 space-y-4">
          <div className="glass-card rounded-3xl p-5 border-zinc-900">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-900">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                In-Store Catalog
              </h2>
              {/* Catalog Search */}
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search inside this store..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-zinc-900 rounded-xl text-xs bg-zinc-950 focus:bg-zinc-900 focus:outline-none focus:border-zinc-800 text-white font-medium"
                />
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {filteredCatalog.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs font-semibold">
                No matching in-store products available for &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {filteredCatalog.map((item, index) => (
                  <div
                    key={item.id}
                    className={`py-4 flex items-center justify-between gap-4 group cursor-pointer hover:bg-zinc-950/40 rounded-xl px-2.5 -mx-2.5 transition-premium animate-fade-in animate-stagger-${Math.min(index + 1, 4)}`}
                    onClick={() => router.push(`/products/${item.id}`)}
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="w-12 h-12 bg-zinc-950 rounded-xl border border-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain p-1 group-hover:scale-102 transition-transform"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                          {item.brand}
                        </span>
                        <h4 className="font-extrabold text-zinc-200 text-xs sm:text-sm truncate group-hover:text-white transition">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 truncate font-medium">
                          {item.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-orange-550">₹{item.price}</span>
                        <span className="text-[9px] text-zinc-550 block font-semibold mt-0.5">
                          Only {item.stockCount} left
                        </span>
                      </div>
                      
                      {(() => {
                        const cartItem = cart?.items.find((i) => i.productId === item.id);
                        if (cartItem) {
                          return (
                            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-2 shadow-sm shrink-0">
                              <button 
                                onClick={(e) => handleQtyChange(e, item.id, -1, cartItem.qty)}
                                className="p-1 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-black text-white min-w-4 text-center">{cartItem.qty}</span>
                              <button 
                                onClick={(e) => handleQtyChange(e, item.id, 1, cartItem.qty)}
                                className="p-1 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }
                        return (
                          <button 
                            onClick={(e) => handleAddClick(e, item)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-200 rounded-xl hover:text-white transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-orange-500" />
                            <span>Add</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: exact store location on a live map */}
        <div className="space-y-4">
          <StoreLocationMap
            storeName={store.name}
            address={store.address}
            latitude={store.latitude}
            longitude={store.longitude}
          />
        </div>

      </div>}

      {activeTab === 'reviews' && (
        <div className="glass-card rounded-3xl p-5 space-y-4 border-zinc-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              Customer Feedback
            </h3>
            <div className="space-y-4 divide-y divide-zinc-900">
              {reviews.map((rev) => (
                <div key={rev.id} className="pt-4 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-200">{rev.userName}</span>
                    <span className="text-zinc-500 flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {rev.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
      )}

      {activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass-card rounded-3xl p-5 space-y-4 border-zinc-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Seller Details</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{store.description || `${store.name} is a verified LocalKart seller serving ${userLoc.name}.`}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4"><span className="text-zinc-500 block mb-1">Business category</span>{store.businessCategory || store.type}</div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4"><span className="text-zinc-500 block mb-1">Pickup location</span>{store.pickupLocation || store.address}</div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4"><span className="text-zinc-500 block mb-1">Phone</span>{store.phone}</div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4"><span className="text-zinc-500 block mb-1">Social</span>{store.socialLinks || 'Not linked'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['Returns', 'Return eligible sealed grocery and electronics items within 7 days. Perishable items are eligible only for quality issues reported at delivery.'],
            ['Refunds', 'Refunds are reviewed by the seller and credited to the original payment method or wallet after approval.'],
            ['Fulfilment', 'Orders are accepted during store hours and packed from live store inventory. Pickup orders are held for 2 hours.'],
          ].map(([title, body]) => (
            <div key={title} className="glass-card rounded-3xl p-5 border-zinc-900">
              <h3 className="text-sm font-bold text-zinc-100 mb-2">{title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">{body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Floating Bottom Cart Summary Banner */}
      {cart && cart.storeId === id && cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-6 md:left-auto md:right-6 md:w-96 md:rounded-2xl animate-in slide-in-from-bottom duration-300">
          <div className="bg-zinc-950/95 border-t border-orange-500/30 p-4.5 flex items-center justify-between shadow-2xl backdrop-blur-md md:rounded-2xl md:border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 animate-pulse">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Your Basket</span>
                <span className="text-xs font-black text-white">{cart.items.length} items • ₹{cart.items.reduce((a, c) => a + c.price * c.qty, 0)}</span>
              </div>
            </div>
            
            <button onClick={handleCheckout} className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer uppercase tracking-wider animate-pulse">Checkout Now</button>
          </div>
        </div>
      )}

      {/* Replace Cart Confirmation Dialog Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-orange-500 animate-bounce" />
            </div>
            
            <div>
              <h3 className="font-extrabold text-zinc-100 text-sm uppercase tracking-wider">Replace Basket Items?</h3>
              <p className="text-xs text-zinc-400 mt-2 font-medium leading-relaxed">
                Your basket contains items from another store. Clear your basket to add items from <strong>{store?.name}</strong>?
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5 pt-1.5">
              <button 
                onClick={() => {
                  setShowReplaceModal(false);
                  setPendingItem(null);
                }}
                className="py-2.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-450 hover:text-zinc-350 border border-zinc-850 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                No, Keep
              </button>
              <button 
                onClick={confirmReplaceBasket}
                className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                Yes, Replace
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
