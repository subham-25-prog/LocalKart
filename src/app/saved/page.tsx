'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MapPin,
  Store as StoreIcon,
  Star,
  ArrowRight,
  Clock,
  ShoppingBag,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { calculateDistance } from '@/lib/geo';
import { PRODUCTS, STORES, STORE_PRODUCTS } from '@/lib/mockData';
import { getWishlist, setWishlist, WISHLIST_EVENT } from '@/lib/wishlist';

interface SavedStore {
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
  openTime: string;
  closeTime: string;
  verified: boolean;
  distance: number;
}

interface SavedProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  brand: string;
  minPrice: number;
  maxPrice: number;
  availableStoresCount: number;
  nearestStore: {
    storeName: string;
    distance: number;
  } | null;
}

export default function SavedPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');
  const [userLoc, setUserLoc] = useState({ lat: 12.9716, lng: 77.6400, name: 'Indiranagar Central' });
  const [savedStoreIds, setSavedStoreIds] = useState<string[]>([]);
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [savedStores, setSavedStores] = useState<SavedStore[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrateSavedItems = useCallback((
    storeIds: string[],
    productIds: string[],
    lat: number,
    lng: number
  ) => {
    setLoading(true);

    // Hydrate stores
    const hydratedStores = STORES.filter((s) => storeIds.includes(s.id)).map((s) => {
      const distance = calculateDistance(lat, lng, s.latitude, s.longitude);
      return {
        ...s,
        distance,
      };
    }).sort((a, b) => a.distance - b.distance);
    setSavedStores(hydratedStores);

    // Hydrate products
    const hydratedProducts = PRODUCTS.filter((p) => productIds.includes(p.id)).map((p) => {
      const inventories = STORE_PRODUCTS.filter(
        (sp) => sp.productId === p.id && sp.isAvailable && sp.stockCount > 0
      );
      const prices = inventories.map((i) => i.price);
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;

      const storeDistances = inventories.map((i) => {
        const store = STORES.find((s) => s.id === i.storeId)!;
        return {
          storeName: store.name,
          distance: calculateDistance(lat, lng, store.latitude, store.longitude),
        };
      }).sort((a, b) => a.distance - b.distance);

      return {
        ...p,
        minPrice,
        maxPrice,
        availableStoresCount: inventories.length,
        nearestStore: storeDistances[0] || null,
      };
    });
    setSavedProducts(hydratedProducts);

    setLoading(false);
  }, []);

  // Load initial settings and saved bookmarks
  useEffect(() => {
    setTimeout(() => {
      let lat = 12.9716;
      let lng = 77.6400;
      let storeIds: string[] = [];
      let productIds: string[] = [];

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

        const storeIdsRaw = localStorage.getItem('localkart_saved_stores');
        if (storeIdsRaw) {
          try {
            storeIds = JSON.parse(storeIdsRaw);
            setSavedStoreIds(storeIds);
          } catch (e) {
            console.error(e);
          }
        }

        productIds = getWishlist();
        setSavedProductIds(productIds);
      }

      hydrateSavedItems(storeIds, productIds, lat, lng);
    }, 0);

    // Location change listener
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newLoc = customEvent.detail;
      setUserLoc(newLoc);
      hydrateSavedItems(savedStoreIds, savedProductIds, newLoc.lat, newLoc.lng);
    };

    window.addEventListener('localkart_location_changed', handleLocationChange);
    window.addEventListener(WISHLIST_EVENT, ((event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail || getWishlist();
      setSavedProductIds(ids);
      hydrateSavedItems(savedStoreIds, ids, userLoc.lat, userLoc.lng);
    }) as EventListener);
    return () => {
      window.removeEventListener('localkart_location_changed', handleLocationChange);
    };
  }, [savedStoreIds, savedProductIds, hydrateSavedItems]);

  const removeStore = (storeId: string) => {
    const updatedIds = savedStoreIds.filter((id) => id !== storeId);
    setSavedStoreIds(updatedIds);
    localStorage.setItem('localkart_saved_stores', JSON.stringify(updatedIds));
    setSavedStores(savedStores.filter((s) => s.id !== storeId));
  };

  const removeProduct = (productId: string) => {
    const updatedIds = savedProductIds.filter((id) => id !== productId);
    setSavedProductIds(updatedIds);
    setWishlist(updatedIds);
    setSavedProducts(savedProducts.filter((p) => p.id !== productId));
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title Header */}
      <section className="bg-zinc-900/60 rounded-3xl p-6 sm:p-8 border border-zinc-800/80 shadow-sm relative overflow-hidden flex flex-col items-start gap-3.5 animate-slide-up">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded bg-zinc-850 border border-zinc-700/50 text-[10px] font-bold text-zinc-350 uppercase tracking-wider shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
          Bookmarked Cabinet
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
          Your Saved Shops & Products
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed max-w-xl">
          Keep track of physical retail stores you love and products you buy regularly near <strong className="text-white font-semibold">{userLoc.name}</strong>.
        </p>
      </section>

      {/* Tabs Switcher */}
      <div className="flex border-b border-zinc-900 overflow-x-auto">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-premium shrink-0 cursor-pointer ${
            activeTab === 'products'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Saved Products ({savedProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('stores')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-premium shrink-0 cursor-pointer ${
            activeTab === 'stores'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <StoreIcon className="w-4 h-4" />
          Saved Stores ({savedStores.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Retrieving bookmarks...</p>
        </div>
      ) : activeTab === 'products' ? (
        /* Saved Products View */
        savedProducts.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto border-zinc-900">
            <div className="w-16 h-16 bg-zinc-950 rounded-full flex items-center justify-center mx-auto text-zinc-400 border border-zinc-850">
              <ShoppingBag className="w-8 h-8 text-orange-550" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">No saved products</h3>
              <p className="text-xs font-semibold text-zinc-455 leading-relaxed">
                Bookmark local products from search results to see price variations across nearest grocery, electronics or pharmacy shops.
              </p>
            </div>
            <button
              onClick={() => router.push('/search')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {savedProducts.map((prod) => (
              <div
                key={prod.id}
                className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group relative border-zinc-900"
              >
                {/* Remove Icon overlay */}
                <button
                  onClick={() => removeProduct(prod.id)}
                  className="absolute top-2.5 right-2.5 p-2 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 hover:text-red-500 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-premium z-10 shadow hover:scale-105"
                  title="Remove from bookmarks"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                </button>

                {/* Product Image */}
                <div className="p-4 bg-zinc-950/60 aspect-[4/3] flex items-center justify-center overflow-hidden shrink-0 relative border-b border-zinc-900/50">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-102 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2.5 left-2.5 text-[9px] font-bold text-zinc-350 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded shadow-sm">
                    {prod.brand}
                  </span>
                </div>

                {/* Product Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-zinc-200 group-hover:text-zinc-50 transition-colors text-sm sm:text-base line-clamp-1">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {prod.nearestStore ? (
                      <div className="bg-zinc-950/50 border border-zinc-900/60 p-2.5 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <StoreIcon className="w-3.5 h-3.5 text-orange-550 shrink-0" />
                            Nearest Shop:
                          </span>
                          <span className="text-orange-500 font-extrabold">{prod.nearestStore.distance.toFixed(1)} km</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-200 truncate block">
                          {prod.nearestStore.storeName}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 font-semibold">Out of stock at all stores</p>
                    )}

                    <div className="flex items-end justify-between border-t border-zinc-900 pt-3">
                      <div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none block">Local Price</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-orange-550">
                            ₹{prod.minPrice}
                          </span>
                          {prod.minPrice !== prod.maxPrice && (
                            <span className="text-xs text-zinc-500 font-medium">
                              - ₹{prod.maxPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none block">Shelves</span>
                        <span className="text-[10px] font-bold text-zinc-300 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded mt-1.5 inline-block">
                          {prod.availableStoresCount} stores
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Compare Link */}
                  <button
                    onClick={() => router.push(`/products/${prod.id}`)}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 transition font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 group/btn cursor-pointer"
                  >
                    Compare Store Prices
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Saved Stores View */
        savedStores.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto border-zinc-900">
            <div className="w-16 h-16 bg-zinc-950 rounded-full flex items-center justify-center mx-auto text-zinc-400 border border-zinc-850">
              <StoreIcon className="w-8 h-8 text-orange-550" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">No saved stores</h3>
              <p className="text-xs font-semibold text-zinc-455 leading-relaxed">
                Bookmark local grocery stores, pharmacies or retail showrooms to easily look up operational status, location directions and contact numbers.
              </p>
            </div>
            <button
              onClick={() => {
                router.push('/');
                setTimeout(() => {
                  const el = document.getElementById('nearby-shops');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
            >
              Browse Nearby Stores
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {savedStores.map((store) => (
              <div
                key={store.id}
                className="glass-card rounded-2xl overflow-hidden flex flex-col group relative border-zinc-900"
              >
                {/* Remove Store overlay */}
                <button
                  onClick={() => removeStore(store.id)}
                  className="absolute top-2.5 right-2.5 p-2 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 hover:text-red-500 border border-zinc-800 rounded-lg transition-premium z-10 shadow hover:scale-105"
                  title="Remove store"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                </button>

                {/* Store banner card header */}
                <div
                  style={{ background: store.banner }}
                  className="h-24 w-full relative shrink-0"
                >
                  <div className="absolute -bottom-6 left-4 border-2 border-zinc-950 rounded-xl overflow-hidden bg-zinc-950 shadow w-12 h-12">
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 pt-8 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-zinc-200 group-hover:text-zinc-50 transition-colors text-sm truncate">
                          {store.name}
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                          {store.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 bg-zinc-950 border border-zinc-850 text-[10px] font-bold text-amber-455 px-1.5 py-0.5 rounded shadow-sm shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        {store.rating.toFixed(1)}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 font-medium mt-2 line-clamp-1">
                      {store.address}
                    </p>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-900 text-xs font-semibold text-zinc-450">
                      <span className="flex items-center gap-1 text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                        <MapPin className="w-3.5 h-3.5 text-orange-550 shrink-0" />
                        {store.distance.toFixed(1)} km away
                      </span>
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {store.openTime} - {store.closeTime}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mt-4 pt-1">
                    <Link
                      href={`/stores/${store.id}`}
                      className="w-full text-center py-2.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-900 hover:border-zinc-800 transition-premium font-bold text-xs rounded-lg block"
                    >
                      View Catalog
                    </Link>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-2.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-900 hover:border-zinc-800 transition-premium font-bold text-xs rounded-lg flex items-center justify-center gap-1"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
