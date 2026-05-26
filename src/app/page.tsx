'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthCheckout } from '@/lib/authGuard';
import { toast } from '@/lib/toast';
import {
  ShoppingBag,
  Apple,
  Tv,
  HeartPulse,
  Flame,
  ArrowRight,
  MapPin,
  Star,
  CheckCircle,
  Clock,
  Sparkles,
  Milk,
  Heart,
  Loader2,
  Navigation,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Zap,
  Store,
  Plus,
  Minus,
  AlertTriangle
} from 'lucide-react';
import { calculateDistance } from '@/lib/geo';
import { STORES, PRODUCTS, STORE_PRODUCTS } from '@/lib/mockData';
import { getCart, addToCart, updateCartQty, clearCart, Cart } from '@/lib/cart';
import { getWishlist, toggleWishlistItem, WISHLIST_EVENT } from '@/lib/wishlist';
import { motion, AnimatePresence } from 'framer-motion';

interface StoreWithDistance {
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
  isOpen: boolean;
}

interface EnrichedProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  brand: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  storeId: string;
  storeName: string;
  rating: number;
  reviewsCount: number;
  ordersCount: number;
  distance: number;
  deliveryEstimate: string;
  scarcityLabel: string | null;
  socialProofLabel: string;
  score: number;
  stockCount: number;
}

const CATEGORIES = [
  { name: 'Dairy & Eggs', icon: Milk, bg: 'bg-zinc-900/40 text-zinc-300 border-zinc-800/80 hover:bg-gradient-to-br hover:from-orange-500/10 hover:to-amber-500/5 hover:border-orange-500/30' },
  { name: 'Grocery', icon: ShoppingBag, bg: 'bg-zinc-900/40 text-zinc-300 border-zinc-800/80 hover:bg-gradient-to-br hover:from-orange-500/10 hover:to-amber-500/5 hover:border-orange-500/30' },
  { name: 'Fresh Produce', icon: Apple, bg: 'bg-zinc-900/40 text-zinc-300 border-zinc-800/80 hover:bg-gradient-to-br hover:from-orange-500/10 hover:to-amber-500/5 hover:border-orange-500/30' },
  { name: 'Electronics', icon: Tv, bg: 'bg-zinc-900/40 text-zinc-300 border-zinc-800/80 hover:bg-gradient-to-br hover:from-orange-500/10 hover:to-amber-500/5 hover:border-orange-500/30' },
  { name: 'Pharmacy', icon: HeartPulse, bg: 'bg-zinc-900/40 text-zinc-300 border-zinc-800/80 hover:bg-gradient-to-br hover:from-orange-500/10 hover:to-amber-500/5 hover:border-orange-500/30' },
];

const TRENDING_KEYWORDS = ['Milk', 'Anker Charger', 'Sony Headphones', 'Rice', 'Crocin'];

const normalizeCatalogDistance = (distanceKm: number, seed: number) => {
  if (distanceKm <= 25) return distanceKm;
  return 0.4 + (seed % 16) / 10;
};

const HERO_BANNERS = [
  {
    id: 'banner-1',
    title: 'Super Saving Sunday!',
    subtitle: 'Flat 50% Off on Fresh Produce & Dairy',
    description: 'Get free instant delivery from local stores near you.',
    code: 'NEIGHBOR50',
    bg: 'bg-gradient-to-br from-orange-600/90 via-amber-600/85 to-zinc-950',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'
  },
  {
    id: 'banner-2',
    title: 'Instant Local Delivery',
    subtitle: 'Electronics & Essentials in 15 Mins',
    description: 'Directly sourced from trusted verified merchants in Indiranagar.',
    code: 'FAST100',
    bg: 'bg-gradient-to-br from-blue-600/90 via-indigo-600/85 to-zinc-950',
    image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500'
  },
  {
    id: 'banner-3',
    title: 'Health & Pharmacy Deals',
    subtitle: 'Save up to 20% on Pain Relief & Wellness',
    description: 'Local pharmacy items delivered securely to your doorstep.',
    code: 'HEALTH20',
    bg: 'bg-gradient-to-br from-emerald-600/90 via-teal-600/85 to-zinc-950',
    image: 'https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=500'
  }
];

export default function HomePage() {
  const router = useRouter();
  const [userLoc, setUserLoc] = useState({ lat: 12.9716, lng: 77.6400, name: 'Indiranagar Central' });
  const [nearbyStores, setNearbyStores] = useState<StoreWithDistance[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  // Cart / Mismatch state
  const [cart, setCart] = useState<Cart | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Homepage UI interaction states
  const [heroIndex, setHeroIndex] = useState(0);
  const [quickBuyTab, setQuickBuyTab] = useState<'under99' | 'under199' | 'essentials'>('under99');

  // Load wishlist from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWishlist(getWishlist());
      const syncWishlist = (event: Event) => {
        setWishlist((event as CustomEvent<string[]>).detail || getWishlist());
      };
      window.addEventListener(WISHLIST_EVENT, syncWishlist);
      return () => window.removeEventListener(WISHLIST_EVENT, syncWishlist);
    }
  }, []);

  // Toggle wishlist handler
  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleWishlistItem(productId);
    setWishlist(updated);
  };

  // Sync cart status
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

  const { handleCheckout } = useAuthCheckout();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Add item click handler
  const handleAddClick = (product: EnrichedProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = addToCart(product.storeId, product.storeName, {
      id: product.id,
      name: product.name,
      price: product.price,
      brand: product.brand,
      image: product.image
    }, 1);

    if (res.storeMismatch) {
      setPendingItem(product);
      setShowReplaceModal(true);
      toast(`Your basket has items from ${res.existingStoreName}.`);
    }
  };

  // Replace item inside basket confirmation handler
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

  // Banners auto-sliding effect
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic Google Places Nearby business loader
  const loadLocalData = async (lat: number, lng: number) => {
    setIsLoadingPlaces(true);

    const loadSimulatedPlaces = () => {
      const mockStoreTemplates = [
        { name: "Fresh Mart Supermarket", type: "Grocery Store", logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100", rating: 4.6, reviewsCount: 148, openTime: "07:30 AM", closeTime: "10:30 PM", banner: "linear-gradient(135deg, #10B981 0%, #059669 100%)" },
        { name: "Sri Krishna Dairy & Provisions", type: "Dairy & Grocery", logo: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=100", rating: 4.8, reviewsCount: 89, openTime: "06:00 AM", closeTime: "09:30 PM", banner: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" },
        { name: "Super Save Hypermarket", type: "Supermarket", logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100", rating: 4.2, reviewsCount: 320, openTime: "08:00 AM", closeTime: "11:00 PM", banner: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" },
        { name: "Quick Meds Pharmacy", type: "Pharmacy & Wellness", logo: "https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=100", rating: 4.5, reviewsCount: 112, openTime: "07:00 AM", closeTime: "11:30 PM", banner: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)" },
        { name: "Alpha Electronics", type: "Electronics Store", logo: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100", rating: 4.4, reviewsCount: 65, openTime: "10:00 AM", closeTime: "09:00 PM", banner: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)" },
        { name: "Organic Harvest Co.", type: "Fresh Produce Store", logo: "https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=100", rating: 4.7, reviewsCount: 42, openTime: "08:00 AM", closeTime: "08:30 PM", banner: "linear-gradient(135deg, #10B981 0%, #065F46 100%)" }
      ];

      const generatedStores = mockStoreTemplates.map((item, idx) => {
        const offsetLat = (idx % 2 === 0 ? 1 : -1) * (0.003 + idx * 0.0012);
        const offsetLng = (idx % 3 === 0 ? 1 : -1) * (0.002 + idx * 0.0014);
        const storeLat = lat + offsetLat;
        const storeLng = lng + offsetLng;
        const dist = calculateDistance(lat, lng, storeLat, storeLng);

        return {
          id: `store-simulated-${idx}`,
          name: item.name,
          type: item.type,
          address: `${15 + idx * 6}, Local St, near ${userLoc.name.split(',')[0]}`,
          latitude: storeLat,
          longitude: storeLng,
          phone: "+91 98765 43210",
          rating: item.rating,
          reviewsCount: item.reviewsCount,
          logo: item.logo,
          banner: item.banner,
          openTime: item.openTime,
          closeTime: item.closeTime,
          verified: true,
          isOpen: idx % 4 !== 0,
          distance: dist
        };
      });

      setNearbyStores(generatedStores);
      setIsLoadingPlaces(false);
    };

    try {
      const savedMode = typeof window !== 'undefined' ? localStorage.getItem('localkart_db_override') || 'mock' : 'mock';
      const res = await fetch(`/api/stores?lat=${lat}&lng=${lng}&radius=2000&db_mode=${savedMode}`);
      const data = await res.json();
      if (data.success && data.stores) {
        const mappedStores = data.stores.map((s: any) => ({
          ...s,
          isOpen: s.openNow ?? true
        }));
        setNearbyStores(mappedStores);
        setIsLoadingPlaces(false);
      } else {
        loadSimulatedPlaces();
      }
    } catch (e) {
      console.error("Backend fetch failed, falling back to simulation:", e);
      loadSimulatedPlaces();
    }
  };

  useEffect(() => {
    setTimeout(() => {
      let lat = 12.9716;
      let lng = 77.6400;
      
      if (typeof window !== 'undefined') {
        const savedLoc = localStorage.getItem('localkart_location');
        if (savedLoc) {
          try {
            const parsed = JSON.parse(savedLoc);
            lat = parsed.lat;
            lng = parsed.lng;
            setUserLoc(parsed);
          } catch (e) {
            console.error(e);
          }
        }
      }

      loadLocalData(lat, lng);
    }, 0);

    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newLoc = customEvent.detail;
      setUserLoc(newLoc);
      loadLocalData(newLoc.lat, newLoc.lng);
    };

    window.addEventListener('localkart_location_changed', handleLocationChange);
    return () => {
      window.removeEventListener('localkart_location_changed', handleLocationChange);
    };
  }, []);

  // Smart Psychology-Driven Weighted Recommendation Algorithm
  const enrichedProducts = useMemo(() => {
    const lat = userLoc.lat;
    const lng = userLoc.lng;

    return PRODUCTS.map((prod) => {
      const inventories = STORE_PRODUCTS.filter(
        (sp) => sp.productId === prod.id && sp.isAvailable && sp.stockCount > 0
      );

      if (inventories.length === 0) return null;

      const options = inventories.map((inv) => {
        const store = STORES.find((s) => s.id === inv.storeId);
        if (!store) return null;
        const rawDistance = calculateDistance(lat, lng, store.latitude, store.longitude);
        const distance = normalizeCatalogDistance(rawDistance, prod.name.charCodeAt(0) + store.name.charCodeAt(0));
        return { inv, store, distance };
      }).filter(Boolean) as Array<{ inv: typeof STORE_PRODUCTS[0]; store: typeof STORES[0]; distance: number }>;

      if (options.length === 0) return null;

      options.sort((a, b) => a.distance - b.distance);
      const bestOption = options[0];

      // stable pseudo-random stats using string hash
      const ratingSeed = prod.name.charCodeAt(2) + prod.name.charCodeAt(prod.name.length - 1);
      const rating = parseFloat((4.2 + (ratingSeed % 8) / 10).toFixed(1));
      const reviewsCount = 20 + (ratingSeed * 11) % 300;
      const ordersCount = 10 + (ratingSeed * 17) % 250;

      const price = bestOption.inv.price;
      const discountPercent = 10 + (ratingSeed % 16); // 10% to 25% discount
      const originalPrice = Math.round(price / (1 - discountPercent / 100));

      const distanceKm = bestOption.distance;
      const deliveryMin = Math.round(10 + distanceKm * 8);
      const deliveryEstimate = `${deliveryMin} mins away`;

      let scarcityLabel: string | null = null;
      if (bestOption.inv.stockCount <= 5) {
        scarcityLabel = "Few left";
      } else if (discountPercent >= 20) {
        scarcityLabel = "Flash Deal";
      } else if (ordersCount >= 180) {
        scarcityLabel = "Selling Fast";
      } else if (rating >= 4.8) {
        scarcityLabel = "Top Rated";
      }

      const socialProofLabel = `${ordersCount}+ ordered nearby today`;

      // Scoring factors
      const ratingWeight = rating * 30;
      const discountWeight = discountPercent * 2;
      const distancePenalty = distanceKm * 20;
      const popularityWeight = ordersCount * 0.3;
      const score = ratingWeight + discountWeight + popularityWeight - distancePenalty;

      return {
        ...prod,
        price,
        originalPrice,
        discountPercent,
        storeId: bestOption.store.id,
        storeName: bestOption.store.name,
        rating,
        reviewsCount,
        ordersCount,
        distance: distanceKm,
        deliveryEstimate,
        scarcityLabel,
        socialProofLabel,
        score,
        stockCount: bestOption.inv.stockCount
      };
    }).filter(Boolean) as EnrichedProduct[];
  }, [userLoc]);

  // Carousels sorting & processing
  const trendingNearYou = useMemo(() => {
    return [...enrichedProducts].sort((a, b) => b.score - a.score).slice(0, 8);
  }, [enrichedProducts]);

  const quickBuyUnder99 = useMemo(() => {
    return enrichedProducts.filter((p) => p.price <= 99).sort((a, b) => a.price - b.price);
  }, [enrichedProducts]);

  const quickBuyUnder199 = useMemo(() => {
    return enrichedProducts.filter((p) => p.price > 99 && p.price <= 199).sort((a, b) => a.price - b.price);
  }, [enrichedProducts]);

  const quickBuyEssentials = useMemo(() => {
    return enrichedProducts.filter((p) => ['Dairy & Eggs', 'Fresh Produce', 'Grocery'].includes(p.category));
  }, [enrichedProducts]);

  const recommendedForYou = useMemo(() => {
    return [...enrichedProducts].sort((a, b) => b.rating - a.rating || b.score - a.score).slice(0, 8);
  }, [enrichedProducts]);

  const frequentlyBoughtNearby = useMemo(() => {
    return [...enrichedProducts].sort((a, b) => b.ordersCount - a.ordersCount).slice(0, 8);
  }, [enrichedProducts]);

  const fastDeliveryItems = useMemo(() => {
    return [...enrichedProducts].sort((a, b) => a.distance - b.distance).slice(0, 8);
  }, [enrichedProducts]);

  // Dynamic store product list resolver
  const getStoreProducts = (storeId: string, storeName: string) => {
    return enrichedProducts.filter(
      (p) => p.storeId === storeId || p.storeName.toLowerCase() === storeName.toLowerCase()
    ).slice(0, 4);
  };

  // Horizontal Scroll Carousel Wrapper
  const ScrollSection = ({ title, subtitle, items }: { title: string; subtitle?: string; items: EnrichedProduct[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
      if (containerRef.current) {
        const scrollAmount = 300;
        containerRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    return (
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              {title}
              {subtitle && (
                <span className="text-[9px] font-black tracking-normal uppercase text-zinc-450 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded shadow-sm">
                  {subtitle}
                </span>
              )}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory"
        >
          {items.map((prod) => (
            <div key={prod.id} className="snap-start shrink-0 w-[180px] sm:w-[220px]">
              <ProductCard product={prod} />
            </div>
          ))}
        </div>
      </section>
    );
  };

  // Individual Product Card Component
  const ProductCard = ({ product }: { product: EnrichedProduct }) => {
    const isWishlisted = wishlist.includes(product.id);
    const cartItem = cart?.items.find((i) => i.productId === product.id && cart.storeId === product.storeId);

    return (
      <div
        onClick={() => router.push(`/products/${product.id}`)}
        className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all duration-300 relative cursor-pointer w-full"
      >
        <div className="p-3 bg-zinc-950/60 aspect-square flex items-center justify-center overflow-hidden shrink-0 relative border-b border-zinc-900/50">
          <img
            src={product.image}
            alt={product.name}
            className="max-h-[85%] max-w-[85%] object-contain group-hover:scale-105 transition-transform duration-300"
          />

          <button
            onClick={(e) => toggleWishlist(product.id, e)}
            className="absolute top-2.5 right-2.5 p-1.5 bg-zinc-900/80 hover:bg-zinc-950 text-zinc-450 hover:text-red-500 rounded-lg border border-zinc-850 shadow transition-colors cursor-pointer"
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-zinc-500'}`} />
          </button>

          {product.scarcityLabel && (
            <span className="absolute top-2.5 left-2.5 text-[8px] font-black text-white bg-orange-600 border border-orange-500/30 px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
              {product.scarcityLabel}
            </span>
          )}

          {product.discountPercent > 0 && (
            <span className="absolute bottom-2 left-2 text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shadow-sm">
              {product.discountPercent}% OFF
            </span>
          )}
        </div>

        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block leading-none">
              {product.brand}
            </span>
            <h3 className="font-extrabold text-zinc-200 text-xs sm:text-sm line-clamp-1 group-hover:text-zinc-50 transition-colors">
              {product.name}
            </h3>
            
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5 text-amber-455">
                <Star className="w-3 h-3 fill-amber-450 text-amber-450" />
                <span className="text-[10px] font-black text-zinc-350">{product.rating}</span>
              </div>
              <span className="text-[9px] text-zinc-650 font-bold">({product.reviewsCount})</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[9px] text-zinc-400 flex flex-col gap-0.5">
              <span className="flex items-center gap-1 font-bold text-zinc-350 truncate">
                <Store className="w-3 h-3 text-orange-500 shrink-0" />
                {product.storeName}
              </span>
              <span className="flex items-center gap-1 text-zinc-550 font-semibold pl-4">
                <Clock className="w-3 h-3 shrink-0" />
                {product.deliveryEstimate}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-900/60">
              <div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[10px] text-zinc-500 font-bold">₹</span>
                  <span className="text-sm font-black text-white">{product.price}</span>
                </div>
                <span className="text-[9px] line-through text-zinc-600 block">₹{product.originalPrice}</span>
              </div>

              {(() => {
                if (cartItem) {
                  return (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="flex items-center bg-zinc-950 border border-zinc-850 rounded-xl p-0.5 gap-1.5 shadow-inner scale-95 shrink-0"
                    >
                      <button
                        onClick={() => updateCartQty(product.id, cartItem.qty - 1)}
                        className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-black text-white min-w-3 text-center">{cartItem.qty}</span>
                      <button
                        onClick={() => updateCartQty(product.id, cartItem.qty + 1)}
                        className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                }
                return (
                  <button
                    onClick={(e) => handleAddClick(product, e)}
                    className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white transition font-black text-[10px] rounded-lg shadow-md shadow-orange-500/10 cursor-pointer shrink-0 uppercase active:scale-95"
                  >
                    Add
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-16 animate-fade-in">
      
      {/* 1. Hero Promo Banner Slider */}
      <div className="relative h-36 sm:h-44 w-full overflow-hidden rounded-2xl border border-zinc-850 shadow-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.45 }}
            className={`absolute inset-0 p-4 sm:p-5 flex flex-col justify-between ${HERO_BANNERS[heroIndex].bg}`}
          >
            <div className="max-w-md space-y-2 relative z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-[9px] font-black text-white uppercase tracking-widest leading-none shadow-sm">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Promo Code: {HERO_BANNERS[heroIndex].code}
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight uppercase tracking-tight">
                {HERO_BANNERS[heroIndex].title}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-orange-100 leading-none">
                {HERO_BANNERS[heroIndex].subtitle}
              </p>
              <p className="hidden sm:block text-[11px] text-zinc-300 font-semibold leading-relaxed max-w-sm">
                {HERO_BANNERS[heroIndex].description}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 relative z-10">
              <button
                onClick={() => router.push(`/search?q=${encodeURIComponent(HERO_BANNERS[heroIndex].title)}`)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-955 font-black text-[10px] uppercase rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                Shop This Deal
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex gap-1.5">
                {HERO_BANNERS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    className={`w-2 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      heroIndex === idx ? 'w-5 bg-orange-500' : 'bg-zinc-550/40'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Background vector graphics overlay */}
            <div className="absolute right-4 bottom-0 opacity-10 select-none pointer-events-none">
              <ShoppingBag className="w-56 h-56 text-white" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Categories Grid */}
      <section className="space-y-3.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
          Browse Categories
        </h2>
        <div className="grid grid-cols-5 gap-2 overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => router.push(`/search?q=${encodeURIComponent(cat.name)}`)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer min-w-20 ${cat.bg} group`}
              >
                <div className="p-2 bg-zinc-950/60 border border-zinc-800/80 rounded-lg shadow-inner group-hover:scale-102 transition-transform">
                  <Icon className="w-5 h-5 text-zinc-400" />
                </div>
                <span className="text-[11px] font-bold mt-2.5 text-zinc-350">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Trending Searches Chips */}
      <section className="flex flex-wrap items-center gap-2 bg-zinc-900/20 border border-zinc-800/60 p-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">
          <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          Trending searches:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TRENDING_KEYWORDS.map((keyword) => (
            <button
              key={keyword}
              onClick={() => router.push(`/search?q=${encodeURIComponent(keyword)}`)}
              className="text-[10px] font-semibold text-zinc-300 bg-zinc-900/40 hover:bg-zinc-800 hover:text-zinc-50 border border-zinc-800/60 hover:border-zinc-700 px-2.5 py-1 rounded transition cursor-pointer"
            >
              {keyword}
            </button>
          ))}
        </div>
      </section>

      {isLoadingPlaces ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-xs font-bold text-zinc-500">Finding nearby stores and fresh prices...</p>
        </div>
      ) : enrichedProducts.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-xs font-semibold text-zinc-500 border-zinc-900">
          Searching for nearby items in your neighborhood coordinates. If you do not see items, try changing the location!
        </div>
      ) : (
        <>
          {/* Immediate product feed */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Recommended Nearby</h2>
                <p className="text-[10px] text-zinc-500 font-semibold">Fresh products from trusted local sellers</p>
              </div>
              <button
                onClick={() => router.push('/search')}
                className="text-[10px] font-bold text-orange-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {trendingNearYou.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </section>

          {/* 4. Trending Near You Section */}
          <ScrollSection 
            title="Trending Near You" 
            subtitle={`Live around ${userLoc.name.split(',')[0]}`} 
            items={trendingNearYou} 
          />

          {/* 5. Quick Buy Hub */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
                  Quick Buy Hub
                </h2>
                <p className="text-[10px] text-zinc-550 font-bold uppercase mt-0.5">Budget Impulse Corner</p>
              </div>

              <div className="flex p-0.5 bg-zinc-950 border border-zinc-850 rounded-xl shadow-inner">
                {[
                  { id: 'under99', label: 'Under ₹99' },
                  { id: 'under199', label: 'Under ₹199' },
                  { id: 'essentials', label: 'Essentials' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setQuickBuyTab(tab.id as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      quickBuyTab === tab.id
                        ? 'bg-zinc-900 border border-zinc-800 text-orange-500 shadow-sm'
                        : 'text-zinc-450 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(() => {
                const list = 
                  quickBuyTab === 'under99' ? quickBuyUnder99 :
                  quickBuyTab === 'under199' ? quickBuyUnder199 :
                  quickBuyEssentials;
                
                if (list.length === 0) {
                  return (
                    <div className="col-span-full py-12 text-center text-xs font-bold text-zinc-600 uppercase tracking-widest">
                      No products available in this price range
                    </div>
                  );
                }
                
                return list.slice(0, 4).map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ));
              })()}
            </div>
          </section>

          {/* 6. Recommended For You Carousel */}
          <ScrollSection 
            title="Recommended For You" 
            subtitle="Picked nearby" 
            items={recommendedForYou} 
          />

          {/* 7. Frequently Bought Nearby Carousel */}
          <ScrollSection 
            title="Frequently Bought Nearby" 
            subtitle="Popular today" 
            items={frequentlyBoughtNearby} 
          />

          {/* 8. Fast Delivery Items Carousel */}
          <ScrollSection 
            title="Fast Delivery Items" 
            subtitle="Urgent Delivery" 
            items={fastDeliveryItems} 
          />

          {/* 9. Store Visibility Section */}
          <section className="space-y-5 pt-4 border-t border-zinc-900">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                More From Nearby Shops
                <span className="text-[9px] font-black tracking-normal uppercase text-zinc-450 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded shadow-sm">
                  Nearby
                </span>
              </h2>
              <p className="text-[10px] text-zinc-550 font-bold uppercase mt-0.5">Explore store collections directly</p>
            </div>

            <div className="space-y-6">
              {nearbyStores.slice(0, 4).map((store) => {
                const storeProductsList = getStoreProducts(store.id, store.name);
                return (
                  <div 
                    key={store.id}
                    className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4.5 space-y-4"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-900/60">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-zinc-850 shrink-0 bg-zinc-950">
                          <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-zinc-200 text-sm leading-none">{store.name}</h4>
                            {store.verified && <CheckCircle className="w-3.5 h-3.5 text-orange-500" />}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-550 font-bold mt-1">
                            <span>{store.type}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-500">
                              <Star className="w-2.5 h-2.5 fill-amber-500" />
                              {store.rating.toFixed(1)}
                            </span>
                            <span>•</span>
                            <span>{store.distance.toFixed(1)} km</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/stores/${store.id}`}
                          className="px-3.5 py-1.5 bg-zinc-950 border border-zinc-850 text-zinc-300 hover:text-white text-[10px] font-bold rounded-lg transition"
                        >
                          View Catalog
                        </Link>
                      </div>
                    </div>

                    {storeProductsList.length === 0 ? (
                      <div className="py-4 text-center text-[10px] font-bold text-zinc-650 uppercase tracking-widest">
                        No products available from this store
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {storeProductsList.map((prod) => (
                          <ProductCard key={prod.id} product={prod} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Floating Bottom Cart Summary Banner */}
      {isMounted && cart && cart.items.length > 0 && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-6 md:left-auto md:right-6 md:w-96 md:rounded-2xl animate-in slide-in-from-bottom duration-305">
          <div className="bg-zinc-950/95 border-t border-orange-500/30 p-4.5 flex items-center justify-between shadow-2xl backdrop-blur-md md:rounded-2xl md:border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 animate-pulse">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Your Basket ({cart.storeName})</span>
                <span className="text-xs font-black text-white">{cart.items.length} items • ₹{cart.items.reduce((a, c) => a + c.price * c.qty, 0)}</span>
              </div>
            </div>
            
            {handleCheckout && (
              <button 
                onClick={handleCheckout}
                className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
              >
                Checkout Now
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Replace Basket Confirmation Dialog Modal */}
      {isMounted && showReplaceModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
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
        </div>,
        document.body
      )}

    </div>
  );
}
