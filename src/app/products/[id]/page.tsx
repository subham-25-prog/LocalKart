'use client';
 
import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthCheckout } from '@/lib/authGuard';
import {
  MapPin,
  Star,
  Clock,
  Phone,
  MessageCircle,
  Navigation,
  ArrowLeft,
  CheckCircle,
  ShoppingBag,
  Loader2,
  Heart,
  Sparkles,
  Plus,
  Minus,
  AlertTriangle
} from 'lucide-react';
import { calculateDistance } from '@/lib/geo';
import { PRODUCTS, STORES, STORE_PRODUCTS } from '@/lib/mockData';
import { toast } from '@/lib/toast';
import { getCart, addToCart, updateCartQty, clearCart, Cart } from '@/lib/cart';

interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  brand: string;
}

interface StoreWithProductDetails {
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
  price: number;
  stockCount: number;
  distance: number;
}

const normalizeCatalogDistance = (distanceKm: number, seed: number) => {
  if (distanceKm <= 25) return distanceKm;
  return 0.4 + (seed % 16) / 10;
};

export default function ProductAvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { handleCheckout } = useAuthCheckout();
  const resolvedParams = use(params);
  const { id } = resolvedParams;
 
  const [userLoc, setUserLoc] = useState({ lat: 12.9716, lng: 77.6400, name: 'Indiranagar Central' });
  const [product, setProduct] = useState<Product | null>(null);
  const [storesList, setStoresList] = useState<StoreWithProductDetails[]>([]);
  const [priceLimits, setPriceLimits] = useState({ min: 0, max: 0 });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('distance');
  const [savedProducts, setSavedProducts] = useState<string[]>([]);

  // Shopping Cart state
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

  const handleAddClick = (storeId: string, storeName: string, price: number) => {
    if (!product) return;
    const res = addToCart(storeId, storeName, {
      id: product.id,
      name: product.name,
      price: price,
      brand: product.brand,
      image: product.image
    }, 1);

    if (res.storeMismatch) {
      setPendingItem({ storeId, storeName, price });
      setShowReplaceModal(true);
    }
  };

  const confirmReplaceBasket = () => {
    if (!pendingItem || !product) return;
    clearCart();
    addToCart(pendingItem.storeId, pendingItem.storeName, {
      id: product.id,
      name: product.name,
      price: pendingItem.price,
      brand: product.brand,
      image: product.image
    }, 1);
    setShowReplaceModal(false);
    setPendingItem(null);
  };

  const toggleSaveProduct = () => {
    let updated;
    if (savedProducts.includes(id)) {
      updated = savedProducts.filter((pId) => pId !== id);
    } else {
      updated = [...savedProducts, id];
    }
    setSavedProducts(updated);
    localStorage.setItem('localkart_saved_products', JSON.stringify(updated));
  };

  // Load product specs and calculate availability
  const loadProductAvailability = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const savedMode = typeof window !== 'undefined' ? localStorage.getItem('localkart_db_override') || 'mock' : 'mock';
      const res = await fetch(`/api/products/${id}?lat=${lat}&lng=${lng}&db_mode=${savedMode}`);
      const data = await res.json();
      if (data.success && data.product) {
        setProduct(data.product);
        setPriceLimits({ min: data.minPrice, max: data.maxPrice });

        const mapped: StoreWithProductDetails[] = data.stores.map((store: StoreWithProductDetails) => ({
          ...store,
          distance: normalizeCatalogDistance(
            store.distance,
            data.product.name.charCodeAt(0) + store.name.charCodeAt(0)
          )
        }));
        // Apply sorting
        if (sortBy === 'price') {
          mapped.sort((a, b) => a.price - b.price);
        } else {
          mapped.sort((a, b) => a.distance - b.distance);
        }
        setStoresList(mapped);
      } else {
        setProduct(null);
      }
    } catch (e) {
      console.error("Backend products fetch failed, using local simulation:", e);
      // Fallback simulator in case of fetch errors
      const matchProd = PRODUCTS.find((p) => p.id === id);
      if (!matchProd) {
        setProduct(null);
        setLoading(false);
        return;
      }
      setProduct(matchProd);

      const inventories = STORE_PRODUCTS.filter((sp) => sp.productId === id && sp.isAvailable && sp.stockCount > 0);
      const prices = inventories.map((i) => i.price);
      const min = prices.length ? Math.min(...prices) : 0;
      const max = prices.length ? Math.max(...prices) : 0;
      setPriceLimits({ min, max });

      const mappedStores = inventories.map((inv) => {
        const store = STORES.find((s) => s.id === inv.storeId)!;
        const distance = normalizeCatalogDistance(
          calculateDistance(lat, lng, store.latitude, store.longitude),
          matchProd.name.charCodeAt(0) + store.name.charCodeAt(0)
        );
        return {
          ...store,
          price: inv.price,
          stockCount: inv.stockCount,
          distance,
        };
      });

      if (sortBy === 'price') {
        mappedStores.sort((a, b) => a.price - b.price);
      } else {
        mappedStores.sort((a, b) => a.distance - b.distance);
      }
      setStoresList(mappedStores);
    } finally {
      setLoading(false);
    }
  }, [id, sortBy]);

  // Sync state on mount and parameters change
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

      loadProductAvailability(lat, lng);
    }, 0);

    // Coordinate state change listener
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newLoc = customEvent.detail;
      setUserLoc(newLoc);
      loadProductAvailability(newLoc.lat, newLoc.lng);
    };

    window.addEventListener('localkart_location_changed', handleLocationChange);
    return () => {
      window.removeEventListener('localkart_location_changed', handleLocationChange);
    };
  }, [loadProductAvailability]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm font-semibold text-zinc-400">Checking store inventories near you...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="glass-card border-zinc-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 bg-zinc-950 text-red-500 border border-zinc-850 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">Product Not Found</h2>
          <p className="text-sm text-zinc-450 font-medium mt-1">
            This item is not available in our current local registry directory.
          </p>
        </div>
        <button
          onClick={() => handleCheckout()}
          className="px-5 py-2.5 bg-zinc-800 text-white hover:bg-zinc-700 transition font-bold text-xs rounded-xl shadow"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Back to Home/Search and location bar */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => router.back()}
          className="p-2 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl shadow hover:bg-zinc-900 transition-premium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-350" />
        </button>
        <div className="text-xs text-zinc-455 font-medium">
          Compare Stores / <span className="font-bold text-zinc-200">{product.name}</span>
        </div>
      </div>

      {/* Main product specification card */}
      <div className="glass-card rounded-3xl p-6 flex flex-col md:flex-row gap-6 border-zinc-900 animate-slide-up">
        {/* Product Image */}
        <div className="w-full md:w-48 aspect-square bg-zinc-950/60 rounded-2xl border border-zinc-900 flex items-center justify-center overflow-hidden shrink-0 group">
          <img
            src={product.image}
            alt={product.name}
            className="max-h-full max-w-full object-contain p-4 group-hover:scale-102 transition-transform duration-300"
          />
        </div>

        {/* Product Details */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="inline-block text-[9px] font-bold text-orange-550 bg-zinc-950 border border-zinc-850 px-2.5 py-1 rounded uppercase tracking-wider">
              {product.brand}
            </div>
            <div className="flex items-start justify-between gap-4 mt-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {product.name}
              </h1>
              <button
                onClick={toggleSaveProduct}
                className="p-2.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-red-505 border border-zinc-900 hover:border-zinc-800 rounded-xl transition-premium shadow cursor-pointer flex items-center justify-center shrink-0"
                title={savedProducts.includes(id) ? "Remove from saved" : "Save product"}
              >
                <Heart className={`w-4 h-4 transition-colors ${savedProducts.includes(id) ? 'fill-red-500 text-red-500' : 'text-zinc-500'}`} />
              </button>
            </div>
            <p className="text-sm text-zinc-400 font-medium mt-1 leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-zinc-900 pt-4 gap-4">
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none block">Est. Local Price Range</span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-2xl font-black text-orange-550">
                  ₹{priceLimits.min}
                </span>
                {priceLimits.min !== priceLimits.max && (
                  <span className="text-base text-zinc-500 font-bold">
                    - ₹{priceLimits.max}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold bg-zinc-950 border border-zinc-900 p-3 rounded-2xl shadow-inner">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <span>
                Distances calculated from: <strong className="text-zinc-200 font-bold">{userLoc.name}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparisons headers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          Available at Nearby Stores
          <span className="text-xs font-black text-zinc-350 bg-zinc-950 border border-zinc-850 px-2.5 py-0.5 rounded tracking-normal shrink-0">
            {storesList.length} stores nearby
          </span>
        </h2>
        
        {/* Sort mechanism */}
        <button
          onClick={() => setSortBy(sortBy === 'distance' ? 'price' : 'distance')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-950 rounded-lg border border-zinc-900 text-xs font-bold text-zinc-350 shadow transition hover:bg-zinc-900 cursor-pointer"
        >
          Sort: {sortBy === 'distance' ? 'Nearest First' : 'Lowest Price First'}
        </button>
      </div>

      {/* Store Comparisons List */}
      <div className="space-y-4">
        {storesList.map((store, index) => (
          <div
            key={store.id}
            className={`glass-card rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group border-zinc-900 animate-fade-in animate-stagger-${Math.min(index + 1, 4)}`}
          >
            {/* Store Information */}
            <div className="flex items-center gap-4.5 w-full md:w-auto">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-zinc-900 shrink-0 bg-zinc-900">
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-zinc-200 group-hover:text-zinc-50 transition-colors text-sm sm:text-base truncate">
                    {store.name}
                  </h3>
                  {store.verified && (
                    <CheckCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-455 font-medium mt-1">
                  <span className="text-zinc-500 capitalize">{store.type}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-amber-455 bg-zinc-950 border border-zinc-850 px-1.5 py-0.5 rounded shadow-sm text-[10px] font-bold shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    {store.rating.toFixed(1)} ({store.reviewsCount})
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-zinc-550">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-zinc-650" />
                    {store.openTime} - {store.closeTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Price & Physical Distance Indicators */}
            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-zinc-900 pt-3 md:pt-0">
              
              <div className="text-left md:text-right shrink-0">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block font-black">Proximity</span>
                <span className="text-[10px] font-black text-zinc-300 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded mt-1.5 inline-block">
                  {store.distance.toFixed(1)} km away
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block font-black">Store Price</span>
                <span className="text-base font-black text-white block mt-0.5">₹{store.price}</span>
              </div>

            </div>

            {/* Direct Action buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 border-zinc-900 pt-3 md:pt-0">
              
              {/* Native deep-link triggers */}
              <a
                href={`tel:${store.phone.replace(/\s+/g, '')}`}
                className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-premium shadow"
                title="Call Store"
              >
                <Phone className="w-4 h-4 shrink-0" />
              </a>

              {store.whatsapp && (
                <a
                  href={`https://wa.me/${store.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-450 hover:text-white hover:bg-zinc-900 transition-premium shadow"
                  title="WhatsApp Business"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                </a>
              )}

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-900 transition-premium font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Navigation className="w-3.5 h-3.5 text-orange-550 shrink-0" />
                Navigate
              </a>

              {(() => {
                const cartItem = cart?.items.find((i) => i.productId === product.id && cart.storeId === store.id);
                if (cartItem) {
                  return (
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-2 shadow-sm shrink-0">
                      <button 
                        onClick={() => updateCartQty(product.id, cartItem.qty - 1)}
                        className="p-1 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black text-white min-w-4 text-center">{cartItem.qty}</span>
                      <button 
                        onClick={() => updateCartQty(product.id, cartItem.qty + 1)}
                        className="p-1 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  );
                }
                return (
                  <button 
                    onClick={() => handleAddClick(store.id, store.name, store.price)}
                    className="px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white transition-premium font-bold text-xs rounded-xl shadow cursor-pointer shrink-0"
                  >
                    + Add to Basket
                  </button>
                );
              })()}

              <Link
                href={`/stores/${store.id}`}
                className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-premium font-bold text-xs rounded-xl shadow"
              >
                View Store
              </Link>
            </div>

          </div>
        ))}
      </div>

      {/* Floating Bottom Cart Summary Banner */}
      {cart && cart.items.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 md:bottom-6 md:left-auto md:right-6 md:w-96 animate-in slide-in-from-bottom duration-300">
          <div className="glass-card bg-zinc-900/90 border border-orange-500/30 p-4 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 animate-pulse">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Your Basket ({cart.storeName})</span>
                <span className="text-xs font-black text-white">{cart.items.length} items • ₹{cart.items.reduce((a, c) => a + c.price * c.qty, 0)}</span>
              </div>
            </div>
            
            <button 
              onClick={handleCheckout}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer animate-pulse"
            >
              View Basket / Checkout
            </button>
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
                Your basket contains items from another store. Clear your basket to add items from this store?
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
