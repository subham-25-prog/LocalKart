'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Clock, CheckCircle, ChevronRight, ShoppingBag, ArrowLeft } from 'lucide-react';

interface OrderItem {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: 'Received' | 'Preparing' | 'Dispatched' | 'Delivered';
  timestamp: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load orders from database / local storage fallback
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success && data.orders && data.orders.length > 0) {
          setOrders(data.orders);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Database fetch failed, loading local orders instead.", err);
      }

      const savedOrders = localStorage.getItem('localkart_vendor_orders');
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          setOrders(parsed);
        } catch (e) {
          console.error('Failed to parse orders', e);
        }
      }
      setLoading(false);
    };

    fetchOrders();

    // Listen for updates from the seller dashboard
    const handleStatusUpdate = () => fetchOrders();
    window.addEventListener('localkart_order_status_updated', handleStatusUpdate);

    return () => {
      window.removeEventListener('localkart_order_status_updated', handleStatusUpdate);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Preparing':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Dispatched':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Delivered':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Received':
      case 'Preparing':
        return <Clock className="w-3.5 h-3.5" />;
      case 'Dispatched':
        return <Package className="w-3.5 h-3.5" />;
      case 'Delivered':
        return <CheckCircle className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-100" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">My Orders</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
          <ShoppingBag className="w-4 h-4 text-zinc-400" />
        </div>
      </header>

      <main className="px-4 py-6 space-y-4 max-w-lg mx-auto">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-lg font-bold text-zinc-200">No orders yet</h2>
            <p className="text-sm text-zinc-500 mt-2">Discover nearby stores and start shopping.</p>
            <Link href="/" className="inline-block mt-6 px-6 py-3 bg-orange-500 text-white font-bold rounded-xl active:scale-95 transition-transform">
              Browse Stores
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 shadow-sm active:bg-zinc-900 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                      Order {order.id}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{order.timestamp}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </div>
                </div>

                <div className="py-3 border-y border-zinc-800/80 mb-3">
                  <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                    {order.items}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-medium">Total Amount</p>
                    <p className="font-bold text-zinc-100">₹{order.total.toFixed(2)}</p>
                  </div>
                  
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-colors group-hover:bg-zinc-700">
                    Reorder
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
