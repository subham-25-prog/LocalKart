'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin, Store, Star, ArrowRight, ArrowUpDown, Loader2, ArrowLeft, Heart, Sparkles, Map } from 'lucide-react';
import { calculateDistance } from '@/lib/geo';
import { PRODUCTS, STORES, STORE_PRODUCTS } from '@/lib/mockData';

interface SearchProduct {
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
    storeId: string;
    storeName: string;
    storeRating: number;
    price: number;
    distance: number;
    lat: number;
    lng: number;
  } | null;
}

const normalizeCatalogDistance = (distanceKm: number, seed: number) => {
  if (distanceKm <= 25) return distanceKm;
  return 0.4 + (seed % 16) / 10;
};

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [userLoc, setUserLoc] = useState({ lat: 12.9716, lng: 77.6400, name: 'Indiranagar Central' });
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('distance');
  const [savedProducts, setSavedProducts] = useState<string[]>([]);
  const [hoveredProduct, setHoveredProduct] = useState<SearchProduct | null>(null);

  const toggleSaveProduct = (productId: string) => {
    let updated;
    if (savedProducts.includes(productId)) {
      updated = savedProducts.filter((id) => id !== productId);
    } else {
      updated = [...savedProducts, productId];
    }
    setSavedProducts(updated);
    localStorage.setItem('localkart_saved_products', JSON.stringify(updated));
  };

  // Trigger search based on query and coordinates
  const performSearch = useCallback((queryStr: string, lat: number, lng: number) => {
    setLoading(true);
    const normalized = queryStr.toLowerCase().trim();

    // Filter products
    const filteredProds = PRODUCTS.filter((p) => {
      if (!normalized) return true;
      return (
        p.name.toLowerCase().includes(normalized) ||
        p.brand.toLowerCase().includes(normalized) ||
        p.category.toLowerCase().includes(normalized)
      );
    });

    // Map inventories, price ranges, and nearest stores
    const mapped = filteredProds
      .map((p) => {
        const inventories = STORE_PRODUCTS.filter(
          (sp) => sp.productId === p.id && sp.isAvailable && sp.stockCount > 0
        );
        if (inventories.length === 0) return null;

        const prices = inventories.map((i) => i.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        // Map stores and calculate distance
        const storesList = inventories.map((i) => {
          const store = STORES.find((s) => s.id === i.storeId)!;
          return {
            storeId: store.id,
            storeName: store.name,
            storeRating: store.rating,
            price: i.price,
            distance: normalizeCatalogDistance(
              calculateDistance(lat, lng, store.latitude, store.longitude),
              p.name.charCodeAt(0) + store.name.charCodeAt(0)
            ),
            lat: store.latitude,
            lng: store.longitude,
          };
        });

        // Sort stores to find the closest one
        storesList.sort((a, b) => a.distance - b.distance);
        const nearestStore = storesList[0];

        return {
          ...p,
          minPrice,
          maxPrice,
          availableStoresCount: inventories.length,
          nearestStore: nearestStore || null,
        } as SearchProduct;
      })
      .filter((item): item is SearchProduct => item !== null);

    // Apply main sorting filter
    if (sortBy === 'price') {
      mapped.sort((a, b) => a.minPrice - b.minPrice);
    } else {
      // Proximity sorting
      mapped.sort((a, b) => {
        const distA = a.nearestStore ? a.nearestStore.distance : 999;
        const distB = b.nearestStore ? b.nearestStore.distance : 999;
        return distA - distB;
      });
    }

    setProducts(mapped);
    if (mapped.length > 0) {
      setHoveredProduct(mapped[0]);
    }
    setLoading(false);
  }, [sortBy]);

  // Sync parameters and coordinate states on load
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

        const savedP = localStorage.getItem('localkart_saved_products');
        if (savedP) {
          try {
            setSavedProducts(JSON.parse(savedP));
          } catch (e) {
            console.error(e);
          }
        }
      }

      const q = searchParams.get('q') || '';
      setSearchQuery(q);
      performSearch(q, lat, lng);
    }, 0);

    // Event listener for location changes
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newLoc = customEvent.detail;
      setUserLoc(newLoc);
      const q = searchParams.get('q') || '';
      performSearch(q, newLoc.lat, newLoc.lng);
    };

    window.addEventListener('localkart_location_changed', handleLocationChange);
    return () => {
      window.removeEventListener('localkart_location_changed', handleLocationChange);
    };
  }, [searchParams, performSearch]);

  return (
    <div className="space-y-6">
      
      {/* Sub-header navigation & search indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900 shadow-inner">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1.5 hover:bg-zinc-800 rounded-lg transition shrink-0 md:hidden border border-zinc-800">
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </Link>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 text-[9px] font-bold text-zinc-350 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-orange-500 animate-pulse" />
              Nearby results
            </div>
            <h1 className="text-base font-bold text-zinc-50">
              {searchParams.get('q') ? `Search Results for "${searchParams.get('q')}"` : 'Browse Nearby Products'}
            </h1>
            <p className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 pt-0.5">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              Showing items relative to delivery pin: <span className="font-bold text-zinc-200">{userLoc.name}</span>
            </p>
          </div>
        </div>

        {/* Filter and Sort options */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSortBy(sortBy === 'distance' ? 'price' : 'distance')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold text-zinc-300 bg-zinc-900/40 hover:bg-zinc-800 transition cursor-pointer shadow-sm"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            Sort: {sortBy === 'distance' ? 'Nearest First' : 'Cheapest First'}
          </button>
        </div>
      </div>

      {/* Main Split-Pane Results section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Searching neighborhood stores...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto border-zinc-900">
          <div className="w-16 h-16 bg-zinc-950 rounded-full flex items-center justify-center mx-auto text-zinc-400 border border-zinc-850">
            <Search className="w-8 h-8 text-orange-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white">No matching products found</h3>
            <p className="text-sm font-medium text-zinc-400 max-w-sm mx-auto leading-relaxed">
              We couldn&apos;t find items matching &ldquo;{searchQuery}&rdquo; in nearby Indiranagar stores. Try searching &ldquo;Milk&rdquo;, &ldquo;Anker&rdquo;, &ldquo;Sony&rdquo;, or &ldquo;Rice&rdquo;.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              router.push('/search');
            }}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-lg shadow transition cursor-pointer"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: List of items (col-span-2) */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className={`glass-card rounded-2xl overflow-hidden flex flex-col group transition-premium ${
                    hoveredProduct?.id === prod.id
                      ? 'border-zinc-700 bg-zinc-900/60 translate-y-[-2px]'
                      : 'border-zinc-900'
                  }`}
                  onMouseEnter={() => setHoveredProduct(prod)}
                >
                  {/* Product Image */}
                  <div className="p-4 bg-zinc-950/60 aspect-[4/3] flex items-center justify-center overflow-hidden shrink-0 relative border-b border-zinc-900/50">
                    <button
                      onClick={() => toggleSaveProduct(prod.id)}
                      className="absolute top-2.5 right-2.5 p-2 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-450 hover:text-red-500 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-premium shadow z-10 cursor-pointer flex items-center justify-center"
                      aria-label={savedProducts.includes(prod.id) ? "Remove from saved" : "Save product"}
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${savedProducts.includes(prod.id) ? 'fill-red-500 text-red-500' : 'text-zinc-500'}`} />
                    </button>
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-400 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded shadow-sm">
                        {prod.brand}
                      </span>
                      <span className="text-[9px] font-bold text-orange-500 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded shadow-sm">
                        {prod.category}
                      </span>
                    </div>
                  </div>

                  {/* Product Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-extrabold text-zinc-200 group-hover:text-zinc-50 transition-colors text-sm sm:text-base line-clamp-1">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      {/* Proximity / Nearest Store details */}
                      {prod.nearestStore ? (
                        <div className="bg-zinc-950/50 border border-zinc-900/60 p-2.5 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                            <span className="flex items-center gap-1 uppercase tracking-wider text-[8px]">
                              <Store className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              Nearest Store:
                            </span>
                            <span className="text-orange-500 font-extrabold">{prod.nearestStore.distance.toFixed(1)} km</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-zinc-200 truncate">
                              {prod.nearestStore.storeName}
                            </span>
                            <div className="flex items-center gap-0.5 bg-zinc-950 border border-zinc-850 text-[10px] font-bold text-amber-455 px-1 py-0.2 rounded shrink-0 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                              {prod.nearestStore.storeRating}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-red-500 font-semibold">Out of stock at all nearby stores</p>
                      )}

                      {/* Aggregated Local Price details */}
                      <div className="flex items-end justify-between border-t border-zinc-900 pt-3">
                        <div>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Local Prices</span>
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
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Shelves</span>
                          <span className="text-[10px] font-black text-zinc-300 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded mt-1.5 inline-block">
                            {prod.availableStoresCount} stores
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compare CTA */}
                    <button
                      onClick={() => router.push(`/products/${prod.id}`)}
                      className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 transition font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 group/btn cursor-pointer"
                    >
                      Compare Store Prices
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Sticky Hyperlocal Mini-Map Preview (col-span-1) */}
          <div className="md:col-span-1">
            <div className="sticky top-24 glass-card rounded-2xl p-5 space-y-4 border-zinc-900 shadow-lg">
              <h3 className="text-xs font-bold text-zinc-350 flex items-center gap-2 uppercase tracking-wider">
                <Map className="w-4 h-4 text-orange-500" />
                Hyperlocal Map Preview
              </h3>

              {/* Nearby shop preview */}
              <div className="h-64 w-full rounded-xl border border-zinc-900 bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center p-4 shadow-inner">
                {/* Grid Dot Overlay */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* User Pin (Center Node) */}
                <div className="absolute flex flex-col items-center z-10">
                  <div className="w-7 h-7 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center shadow-md shrink-0 relative">
                    <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <span className="text-[8px] font-black text-zinc-450 mt-1 bg-zinc-900/90 border border-zinc-800 px-1.5 py-0.5 rounded shadow">
                    You ({userLoc.name.split(',')[0]})
                  </span>
                </div>

                {/* Store marker */}
                {hoveredProduct?.nearestStore && (
                  <div className="absolute top-10 right-10 flex flex-col items-center z-10 animate-fade-in">
                    <div className="w-6 h-6 bg-orange-500 border border-white rounded-full flex items-center justify-center shadow-md shrink-0 relative">
                      <Store className="w-3 h-3 text-zinc-950" />
                    </div>
                    <span className="text-[7px] font-bold text-zinc-950 mt-1 bg-white border border-zinc-300 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      {hoveredProduct.nearestStore.storeName} ({hoveredProduct.nearestStore.distance.toFixed(1)} km)
                    </span>
                  </div>
                )}
              </div>

              {/* Details of active hovered shop */}
              {hoveredProduct?.nearestStore ? (
                <div className="bg-zinc-950/40 rounded-xl p-4 border border-zinc-900 space-y-3.5 animate-slide-up">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-extrabold text-zinc-200 text-xs truncate">{hoveredProduct.nearestStore.storeName}</h4>
                      <span className="text-[8px] text-zinc-550 font-bold uppercase block mt-0.5">Nearest delivery outlet</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center border-t border-zinc-900 pt-3">
                    <div>
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Local Price</span>
                      <span className="text-xs font-black text-orange-500 mt-0.5 block">₹{hoveredProduct.nearestStore.price}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Rating</span>
                      <span className="text-xs font-black text-amber-450 mt-0.5 block flex items-center justify-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {hoveredProduct.nearestStore.storeRating}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/stores/${hoveredProduct.nearestStore.storeId}`}
                      className="w-full text-center py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white transition font-bold text-[10px] rounded-lg block cursor-pointer"
                    >
                      View Full Catalog
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 text-center font-medium leading-relaxed">
                  Hover over a product to preview the nearest store and current local price.
                </p>
              )}

              <div className="pt-2 text-center">
                <Link
                  href="/map"
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Map className="w-4 h-4 text-orange-500 shrink-0" />
                  Open Map View
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense
      fallback = {
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Initializing search...</p>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
