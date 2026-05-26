'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Star,
  CheckCircle,
  Clock,
  Sparkles,
  Sliders,
  DollarSign,
  Plus,
  Minus,
  Loader2
} from 'lucide-react';
import { PRODUCTS, STORES, STORE_PRODUCTS } from '@/lib/mockData';

interface OrderItem {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: 'Received' | 'Preparing' | 'Dispatched' | 'Delivered';
  timestamp: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  name: string;
  category: string;
  price: number;
  stockCount: number;
  image: string;
}

export default function VendorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ role?: string; name: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  // Tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'inventory'>('analytics');
  
  // Store info
  const vendorStore = STORES[1]; // Sri Krishna Dairy as default mock
  
  // Custom states
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize data
  useEffect(() => {
    // Auth check
    const savedUser = localStorage.getItem('localkart_user');
    let currentUser = null;
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
      } catch (e) {}
    }
    setUser(currentUser);
    setAuthChecked(true);

    if (!currentUser || currentUser.role !== 'seller') {
      return;
    }

    setTimeout(() => {
      // 1. Load/Set simulated vendor orders
      const savedOrders = localStorage.getItem('localkart_vendor_orders');
      if (savedOrders) {
        try {
          setOrders(JSON.parse(savedOrders));
        } catch (e) {
          console.error(e);
        }
      } else {
        const defaultOrders: OrderItem[] = [
          {
            id: 'LK-9382',
            customerName: 'Lokesh Kumar',
            items: '2x Amul Taaza Fresh Milk (1L), 1x English Oven Whole Wheat Bread',
            total: 102.0,
            status: 'Preparing',
            timestamp: '10 mins ago',
          },
          {
            id: 'LK-8471',
            customerName: 'Aarav Sharma',
            items: '1x India Gate Basmati Rice Premium (1kg), 12x Farm Fresh White Eggs',
            total: 194.0,
            status: 'Received',
            timestamp: '25 mins ago',
          },
          {
            id: 'LK-7362',
            customerName: 'Neha Patel',
            items: '6x Robusta Organic Bananas, 2x English Oven Whole Wheat Bread',
            total: 132.0,
            status: 'Delivered',
            timestamp: 'Yesterday',
          },
        ];
        localStorage.setItem('localkart_vendor_orders', JSON.stringify(defaultOrders));
        setOrders(defaultOrders);
      }

      // 2. Load inventory details for Sri Krishna Dairy (store-krishnadairy)
      const storeId = 'store-krishnadairy';
      const storeProds = STORE_PRODUCTS.filter((sp) => sp.storeId === storeId);
      const mappedInventory = storeProds.map((sp) => {
        const product = PRODUCTS.find((p) => p.id === sp.productId)!;
        return {
          id: sp.id,
          productId: product.id,
          name: product.name,
          category: product.category,
          price: sp.price,
          stockCount: sp.stockCount,
          image: product.image,
        };
      });
      setInventory(mappedInventory);
    }, 0);
  }, []);

  // Update order status and sync with local storage
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: 'Preparing' | 'Dispatched' | 'Delivered') => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn("Database PATCH status update failed. Synchronizing locally.");
      }
    } catch (e) {
      console.warn("Database order status update threw an error, fallback to localized storage sync.");
    }

    const updated = orders.map((ord) => {
      if (ord.id === orderId) {
        return { ...ord, status: nextStatus };
      }
      return ord;
    });
    setOrders(updated);
    localStorage.setItem('localkart_vendor_orders', JSON.stringify(updated));
    
    // Also update standard checkout tracker if it corresponds to active buyer order
    localStorage.setItem('localkart_active_tracking_status', nextStatus);
    
    // Fire coordinate / status updates
    window.dispatchEvent(new Event('localkart_order_status_updated'));
    setIsUpdating(false);
  };

  // Adjust stock and pricing
  const handleUpdateStock = (invId: string, amount: number) => {
    const updated = inventory.map((inv) => {
      if (inv.id === invId) {
        const newStock = Math.max(0, inv.stockCount + amount);
        return { ...inv, stockCount: newStock };
      }
      return inv;
    });
    setInventory(updated);
  };

  const handleUpdatePrice = (invId: string, newPrice: number) => {
    const updated = inventory.map((inv) => {
      if (inv.id === invId) {
        return { ...inv, price: Math.max(1, newPrice) };
      }
      return inv;
    });
    setInventory(updated);
  };

  // Calculate stats
  const activeOrdersCount = orders.filter((o) => o.status !== 'Delivered').length;
  const totalRevenue = orders.reduce((acc, curr) => acc + curr.total, 0) + 12480; // Mock historical base

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3 text-center text-zinc-400 animate-fade-in">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm font-semibold">Verifying merchant authorization...</p>
      </div>
    );
  }

  if (!user || user.role !== 'seller') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
          <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-pulse">
            <span className="text-2xl">🔒</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-tight">Merchant Access Required</h2>
            <p className="text-xs text-zinc-450 font-medium leading-relaxed">
              This terminal is reserved for registered LocalKart sellers. Please sign in with a merchant profile to manage inventory and fulfill customer orders.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/"
              className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-955 font-bold text-xs rounded-xl transition shadow text-center cursor-pointer"
            >
              Return to Buyer Home
            </Link>
            <button
              onClick={() => {
                localStorage.setItem('localkart_trigger_login', 'true');
                router.push('/');
              }}
              className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition text-xs font-bold rounded-xl cursor-pointer text-center"
            >
              Sign In as Merchant
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">

      {/* Header Profile Section - Quiet Luxury style */}
      <section className="bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12">
          <ShoppingBag className="w-64 h-64 text-zinc-700" />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0">
            <img src={vendorStore.logo} alt={vendorStore.name} className="w-full h-full object-cover" />
          </div>
          <div className="text-center sm:text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-850 text-xs font-semibold text-zinc-450 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              Store Console / IND-EAST
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-zinc-50">
              {vendorStore.name} Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium max-w-xl">
              Manage your local provisions catalog, track real-time neighbor group checkout delivery orders, and oversee active coordinate telemetry.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation tabs */}
      <div className="flex border-b border-zinc-800/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-zinc-100 text-zinc-100'
              : 'border-transparent text-zinc-450 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Store Analytics
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'orders'
              ? 'border-zinc-100 text-zinc-100'
              : 'border-transparent text-zinc-450 hover:text-zinc-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Order Queue ({activeOrdersCount})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-zinc-100 text-zinc-100'
              : 'border-transparent text-zinc-450 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Inventory Catalog ({inventory.length})
        </button>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="matte-card rounded-2xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start text-zinc-400">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Gross Sales</span>
                  <h3 className="text-2xl font-black text-zinc-100 mt-1">₹{totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] text-emerald-500 font-bold mt-4 flex items-center gap-1">
                <span>↑ +18.4%</span>
                <span className="text-zinc-500 font-medium">from last week</span>
              </div>
            </div>

            <div className="matte-card rounded-2xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start text-zinc-400">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Active Queue</span>
                  <h3 className="text-2xl font-black text-zinc-100 mt-1">{activeOrdersCount} Orders</h3>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] text-zinc-400 font-semibold mt-4 flex items-center gap-1">
                <span>Ready to prepare</span>
              </div>
            </div>

            <div className="matte-card rounded-2xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start text-zinc-400">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Customer Reach</span>
                  <h3 className="text-2xl font-black text-zinc-100 mt-1">312 Buyers</h3>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-orange-500">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 font-medium mt-4 flex items-center gap-1">
                <span>Within 1.5 km Indiranagar</span>
              </div>
            </div>

            <div className="matte-card rounded-2xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start text-zinc-400">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Store Rating</span>
                  <h3 className="text-2xl font-black text-zinc-100 mt-1">4.8 Stars</h3>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-amber-500">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 font-medium mt-4 flex items-center gap-1">
                <span>Based on 89 ratings</span>
              </div>
            </div>
          </div>

          {/* SVG Line Chart for Sales & Group Buying Trends */}
          <div className="matte-card rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">Hyperlocal Earnings Curve (7 Days)</h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">Tracking daily orders and near-expiry deal checkout volumes.</p>
            </div>
            
            <div className="h-56 w-full pt-4">
              <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e4e4e7" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#e4e4e7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal lines */}
                <line x1="0" y1="40" x2="700" y2="40" stroke="#27272a" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="700" y2="100" stroke="#27272a" strokeDasharray="4 4" />
                <line x1="0" y1="160" x2="700" y2="160" stroke="#27272a" strokeDasharray="4 4" />

                {/* Path Area */}
                <path
                  d="M 20 160 Q 120 120 220 130 T 420 70 T 620 30 L 680 50 L 680 180 L 20 180 Z"
                  fill="url(#chartGradient)"
                />

                {/* Main line */}
                <path
                  d="M 20 160 Q 120 120 220 130 T 420 70 T 620 30 L 680 50"
                  fill="none"
                  stroke="#d4d4d8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                <circle cx="220" cy="130" r="4" fill="#a1a1aa" stroke="#09090b" strokeWidth="2" />
                <circle cx="420" cy="70" r="4" fill="#a1a1aa" stroke="#09090b" strokeWidth="2" />
                <circle cx="620" cy="30" r="4" fill="#f97316" stroke="#09090b" strokeWidth="2" /> {/* Highlight high deal volume day */}

                {/* Text indicators */}
                <text x="220" y="115" fill="#a1a1aa" fontSize="10" fontWeight="bold" textAnchor="middle">₹3,450</text>
                <text x="420" y="55" fill="#a1a1aa" fontSize="10" fontWeight="bold" textAnchor="middle">₹5,900</text>
                <text x="620" y="15" fill="#f97316" fontSize="10" fontWeight="bold" textAnchor="middle">₹8,490 🔥</text>

                {/* X Axis Labels */}
                <text x="20" y="195" fill="#52525b" fontSize="9" fontWeight="bold">Mon</text>
                <text x="130" y="195" fill="#52525b" fontSize="9" fontWeight="bold">Tue</text>
                <text x="240" y="195" fill="#52525b" fontSize="9" fontWeight="bold">Wed</text>
                <text x="350" y="195" fill="#52525b" fontSize="9" fontWeight="bold">Thu</text>
                <text x="460" y="195" fill="#52525b" fontSize="9" fontWeight="bold">Fri</text>
                <text x="570" y="195" fill="#52525b" fontSize="9" fontWeight="bold">Sat</text>
                <text x="670" y="195" fill="#fafafa" fontSize="9" fontWeight="bold">Today</text>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Order Queue Tab */}
      {activeTab === 'orders' && (
        <div className="matte-card rounded-3xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">Simulated Order Dispatch Queue</h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">Ticking off states here links directly to buyer delivery tracking.</p>
            </div>
            {isUpdating && <Clock className="w-4 h-4 text-zinc-400 animate-spin" />}
          </div>

          {orders.length === 0 ? (
            <p className="text-center py-10 text-xs text-zinc-505 font-semibold">No active queue orders received.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-zinc-950/40 rounded-2xl p-5 border border-zinc-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-100">{ord.id}</span>
                      <span className="text-[10px] text-zinc-350 bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 rounded-full font-bold uppercase">{ord.status}</span>
                      <span className="text-[10px] text-zinc-500 font-semibold">{ord.timestamp}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-300">Buyer: {ord.customerName}</p>
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-xl">{ord.items}</p>
                  </div>

                  <div className="flex items-center justify-between gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800/80">
                    <span className="text-sm font-bold text-zinc-100">₹{ord.total}</span>
                    
                    <div className="flex gap-2">
                      {ord.status === 'Received' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'Preparing')}
                          className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-[10px] rounded-lg shadow-sm transition cursor-pointer"
                        >
                          Start Preparing
                        </button>
                      )}
                      {ord.status === 'Preparing' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'Dispatched')}
                          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-150 border border-zinc-700/60 font-bold text-[10px] rounded-lg shadow-sm transition cursor-pointer"
                        >
                          Dispatch Rider
                        </button>
                      )}
                      {ord.status === 'Dispatched' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'Delivered')}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg shadow-sm transition cursor-pointer"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {ord.status === 'Delivered' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          Handed Over
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inventory Catalog Tab */}
      {activeTab === 'inventory' && (
        <div className="matte-card rounded-3xl p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-zinc-100 text-base">In-Store Stock Registry</h3>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">Control pricing margins and physical shelves indicators.</p>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {inventory.map((inv) => (
              <div key={inv.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-950 overflow-hidden shrink-0 border border-zinc-850">
                    <img src={inv.image} alt={inv.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-zinc-100 line-clamp-1">{inv.name}</h4>
                    <p className="text-[10px] text-zinc-505 font-semibold mt-0.5">{inv.category}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 justify-between sm:justify-end">
                  {/* Stock control */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-505 font-bold uppercase tracking-wider">Stock:</span>
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shrink-0">
                      <button
                        onClick={() => handleUpdateStock(inv.id, -5)}
                        className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition shrink-0 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold px-2.5 text-zinc-100 min-w-8 text-center">{inv.stockCount}</span>
                      <button
                        onClick={() => handleUpdateStock(inv.id, 5)}
                        className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Pricing slider control */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-505 font-bold uppercase tracking-wider">Price:</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="range"
                        min={10}
                        max={inv.price * 2}
                        value={inv.price}
                        onChange={(e) => handleUpdatePrice(inv.id, parseFloat(e.target.value))}
                        className="w-20 accent-zinc-400 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-zinc-100 min-w-10 text-right">₹{inv.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
