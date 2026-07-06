'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthCheckout } from '@/lib/authGuard';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  Award,
  Clock,
  MapPin,
  Heart,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Star,
  RefreshCw,
  Gift,
  HelpCircle,
} from 'lucide-react';
import { calculateDistance } from '@/lib/geo';
import { PRODUCTS, STORES, STORE_PRODUCTS } from '@/lib/mockData';

interface OrderHistoryItem {
  id: string;
  date: string;
  storeName: string;
  storeLogo: string;
  items: string;
  total: number;
  status: 'Received' | 'Preparing' | 'Dispatched' | 'Delivered';
  color: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { handleCheckout } = useAuthCheckout();

  // User details state
  const [user, setUser] = useState({
    name: 'Lokesh Kumar',
    email: 'lokesh.k@localkart.com',
    phone: '+91 98765 43210',
    membership: 'Gold Explorer',
  });

  const [activeTrackingStatus, setActiveTrackingStatus] = useState<string | null>(null);
  const [savedStoresCount, setSavedStoresCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);

  const [ordersList, setOrdersList] = useState<OrderHistoryItem[]>([
    {
      id: 'LK-9382',
      date: 'May 22, 2026',
      storeName: 'Sri Krishna Dairy & Provisions',
      storeLogo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=100&h=100&fit=crop',
      items: '2x Amul Taaza Fresh Milk (1L), 1x English Oven Whole Wheat Bread',
      total: 102.0,
      status: 'Delivered',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'LK-8471',
      date: 'May 18, 2026',
      storeName: 'Fresh Mart Supermarket',
      storeLogo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
      items: '1x India Gate Basmati Rice Premium (1kg), 12x Farm Fresh White Eggs',
      total: 194.0,
      status: 'Delivered',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'LK-7362',
      date: 'May 10, 2026',
      storeName: 'Alpha Electronics',
      storeLogo: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100&h=100&fit=crop',
      items: '1x Anker PowerPort 20W USB-C Fast Charger',
      total: 1399.0,
      status: 'Delivered',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
  ]);

  // Load and hydrate stats
  useEffect(() => {
    setTimeout(() => {
      // 1. Sync user details
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('localkart_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error(e);
          }
        }

        // 2. Load bookmarks counts
        const storesRaw = localStorage.getItem('localkart_saved_stores');
        if (storesRaw) {
          try {
            setSavedStoresCount(JSON.parse(storesRaw).length);
          } catch (e) {
            console.warn('Failed to parse saved stores count:', e);
          }
        } else {
          setSavedStoresCount(3); // Mock default
        }

        const prodsRaw = localStorage.getItem('localkart_saved_products');
        if (prodsRaw) {
          try {
            setSavedProductsCount(JSON.parse(prodsRaw).length);
          } catch (e) {
            console.warn('Failed to parse saved products count:', e);
          }
        } else {
          setSavedProductsCount(2); // Mock default
        }

        // 3. Check for active tracking order
        const trackingStatus = localStorage.getItem('localkart_active_tracking_status');
        if (trackingStatus && trackingStatus !== 'Delivered') {
          setActiveTrackingStatus(trackingStatus);
        }

        // 4. Update status dynamically if vendor updates it
        const savedVendorOrders = localStorage.getItem('localkart_vendor_orders');
        if (savedVendorOrders) {
          try {
            const vendorOrders = JSON.parse(savedVendorOrders);
            const myActiveOrder = vendorOrders.find((vo: { customerName: string; id: string; status: 'Received' | 'Preparing' | 'Dispatched' | 'Delivered' }) => vo.customerName === 'Lokesh Kumar' || vo.customerName === user.name);
            if (myActiveOrder) {
              const myOrderHistory = ordersList.map((ord) => {
                if (ord.id === myActiveOrder.id) {
                  return {
                    ...ord,
                    status: myActiveOrder.status,
                    color: myActiveOrder.status === 'Delivered'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-orange-450 bg-orange-500/10 border-orange-500/20',
                  };
                }
                return ord;
              });
              setOrdersList(myOrderHistory);
              if (myActiveOrder.status !== 'Delivered') {
                setActiveTrackingStatus(myActiveOrder.status);
              } else {
                setActiveTrackingStatus(null);
              }
            }
          } catch (e) {
            console.warn('Failed to parse vendor orders for active tracking:', e);
          }
        }
      }
    }, 0);

    const handleVendorUpdate = () => {
      const trackingStatus = localStorage.getItem('localkart_active_tracking_status');
      if (trackingStatus && trackingStatus !== 'Delivered') {
        setActiveTrackingStatus(trackingStatus);
      } else {
        setActiveTrackingStatus(null);
      }
    };
    window.addEventListener('localkart_order_status_updated', handleVendorUpdate);
    return () => {
      window.removeEventListener('localkart_order_status_updated', handleVendorUpdate);
    };
  }, [ordersList, user.name]);

  // Reorder simulator
  const handleReorder = (order: OrderHistoryItem) => {
    alert(`Added items from ${order.id} back to checkout cart! Redirecting...`);
    handleCheckout();
  };

  return (
    <div className="space-y-6 pb-16">

      {/* Hero Welcome banner - Quiet Luxury style */}
      <section className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12">
          <User className="w-64 h-64 text-zinc-700" />
        </div>
        <div className="max-w-xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-850 text-xs font-semibold text-zinc-450 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Personal Cabin / IND-CENTRAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-zinc-50">
            Welcome Back, <span className="text-orange-500">{user.name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium">
            Monitor real-time delivery telemetry, redeem loyalty benefits explorer multipliers, and review receipts of Indiranagar vendors.
          </p>
        </div>
      </section>

      {/* Grid of stats & active trackers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left pane: Loyalty explorer card & quick stats */}
        <div className="md:col-span-1 space-y-6">
          {/* Carbon Voyage Membership */}
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-sm relative overflow-hidden group">
            
            <div className="flex items-center justify-between">
              <Award className="w-10 h-10 text-amber-500 fill-amber-500/10" />
              <span className="text-[9px] font-bold uppercase bg-zinc-950 text-zinc-400 border border-zinc-800 px-2.5 py-1 rounded-full tracking-wider">
                {user.membership}
              </span>
            </div>

            <div className="mt-6 space-y-1">
              <h3 className="text-sm font-bold text-zinc-100">Indiranagar Voyager</h3>
              <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">Leveling rewards: Free delivery from Sri Krishna Dairy.</p>
            </div>

            {/* Progress bar to next level */}
            <div className="mt-5 space-y-1.5">
              <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400">
                <span>XP Progress</span>
                <span className="text-zinc-350">85 / 100 PTS</span>
              </div>
              <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                <div className="h-full bg-zinc-100 rounded-full" style={{ width: '85%' }} />
              </div>
              <p className="text-[9px] text-zinc-500 font-semibold text-right">15 points remaining to Platinum tier</p>
            </div>

            {/* Quick stats buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-zinc-850">
              <Link href="/saved" className="bg-zinc-950 hover:border-zinc-700 p-3 rounded-2xl border border-zinc-850 text-center transition-all block">
                <span className="text-lg font-black text-zinc-100 block">{savedStoresCount}</span>
                <span className="text-[9px] text-zinc-500 font-bold uppercase block mt-0.5">Shops Saved</span>
              </Link>
              <Link href="/saved" className="bg-zinc-950 hover:border-zinc-700 p-3 rounded-2xl border border-zinc-850 text-center transition-all block">
                <span className="text-lg font-black text-zinc-100 block">{savedProductsCount}</span>
                <span className="text-[9px] text-zinc-500 font-bold uppercase block mt-0.5">Prods Tracked</span>
              </Link>
            </div>
          </div>

          {/* Help & Gift Cards */}
          <div className="matte-card rounded-3xl p-5 space-y-4">
            <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
              <Gift className="w-4 h-4 text-zinc-400" />
              Special Perks
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-xs font-bold">2x</div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Indiranagar Group Buy Deals</h4>
                  <p className="text-[9px] text-zinc-500 mt-0.5">Earn 2x rewards on deals page checkout.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-xs font-bold">Free</div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Hyperlocal Delivery</h4>
                  <p className="text-[9px] text-zinc-500 mt-0.5">No delivery fees within 1 km radius.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: Active order progress & detailed history */}
        <div className="md:col-span-2 space-y-6">
          {/* Active tracking notification */}
          {activeTrackingStatus && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/20">
                    <Clock className="w-3 h-3 text-orange-500" />
                    Simulated Delivery Active
                  </div>
                  <h3 className="text-base font-bold text-zinc-150">Rider is dispatching from Dairy Shop</h3>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                    Status: <span className="text-orange-500 font-bold uppercase">{activeTrackingStatus}</span>. Real-time path maps coordinate tracking is active.
                  </p>
                </div>

                <button
                  onClick={() => router.push('/delivery')}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                >
                  Track Live Rider
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Historical Order Receipts log */}
          <div className="matte-card rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">Past Transaction Receipts</h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">Itemized billing summaries from verified local physical vendors.</p>
            </div>

            <div className="space-y-4">
              {ordersList.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-zinc-950/40 rounded-2xl p-4 border border-zinc-850 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition-all duration-300"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0">
                      <img src={ord.storeLogo} alt={ord.storeName} className="w-full h-full object-cover" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100">{ord.id}</span>
                        <span className="text-[10px] text-zinc-500 font-semibold">{ord.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-300 truncate mt-1">{ord.storeName}</h4>
                      <p className="text-[10px] text-zinc-500 truncate font-semibold mt-0.5 leading-relaxed">{ord.items}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/80">
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-xs font-bold text-zinc-100 block">₹{ord.total.toFixed(2)}</span>
                      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded mt-1.5 inline-block border ${
                        ord.status === 'Delivered'
                          ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-orange-500 bg-orange-500/10 border-orange-500/20'
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleReorder(ord)}
                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 font-bold text-[10px] rounded-lg transition shrink-0 cursor-pointer"
                    >
                      Reorder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
