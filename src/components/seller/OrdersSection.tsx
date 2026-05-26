'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardList, Loader2, Package, RefreshCcw, Truck } from 'lucide-react';
import { toast } from '@/lib/toast';

type OrderStatus = 'Received' | 'Preparing' | 'Dispatched' | 'Delivered';

type SellerOrder = {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: OrderStatus;
  timestamp: string;
};

const ORDER_KEY = 'localkart_vendor_orders';
const STATUS_FLOW: OrderStatus[] = ['Received', 'Preparing', 'Dispatched', 'Delivered'];

const DEFAULT_ORDERS: SellerOrder[] = [
  {
    id: 'LK-9382',
    customerName: 'Lokesh Kumar',
    items: '2x Amul Taaza Fresh Milk (1L), 1x English Oven Whole Wheat Bread',
    total: 102,
    status: 'Preparing',
    timestamp: '10 mins ago'
  },
  {
    id: 'LK-8471',
    customerName: 'Aarav Sharma',
    items: '1x India Gate Basmati Rice Premium (1kg), 12x Farm Fresh White Eggs',
    total: 194,
    status: 'Received',
    timestamp: '25 mins ago'
  }
];

function readOrders() {
  if (typeof window === 'undefined') return DEFAULT_ORDERS;
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) {
      localStorage.setItem(ORDER_KEY, JSON.stringify(DEFAULT_ORDERS));
      return DEFAULT_ORDERS;
    }
    return JSON.parse(raw) as SellerOrder[];
  } catch {
    return DEFAULT_ORDERS;
  }
}

function saveOrders(orders: SellerOrder[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event('localkart_order_status_updated'));
}

export default function OrdersSection() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders?storeId=store-krishnadairy');
      const data = await response.json();
      if (data.success && data.orders?.length) {
        setOrders(data.orders);
        saveOrders(data.orders);
        return;
      }
      setOrders(readOrders());
    } catch {
      setOrders(readOrders());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleOrders = useMemo(() => {
    if (filter === 'All') return orders;
    return orders.filter((order) => order.status === filter);
  }, [filter, orders]);

  const advanceOrder = (orderId: string) => {
    const nextOrders = orders.map((order) => {
      if (order.id !== orderId) return order;
      const currentIndex = STATUS_FLOW.indexOf(order.status);
      const nextStatus = STATUS_FLOW[Math.min(currentIndex + 1, STATUS_FLOW.length - 1)];
      localStorage.setItem('localkart_active_tracking_order_id', order.id);
      localStorage.setItem('localkart_active_tracking_status', nextStatus);
      return { ...order, status: nextStatus };
    });
    setOrders(nextOrders);
    saveOrders(nextOrders);
    toast('Order status updated');
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-black uppercase tracking-wider text-zinc-50">Orders</h1>
          <p className="text-xs font-medium text-zinc-500">Accept, pack, dispatch, and notify customers from one queue.</p>
        </div>
        <button
          onClick={loadOrders}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-900"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['All', ...STATUS_FLOW] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black uppercase transition ${
              filter === status
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/70 py-16">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-zinc-700" />
          <h2 className="mt-3 text-sm font-black text-zinc-100">No orders in this state</h2>
          <p className="mt-1 text-xs text-zinc-500">New checkout orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const statusIndex = STATUS_FLOW.indexOf(order.status);
            const isDone = order.status === 'Delivered';
            return (
              <article key={order.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-zinc-50">{order.id}</span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-500">
                        {order.timestamp}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-zinc-200">{order.customerName}</h3>
                    <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-zinc-500">{order.items}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
                    <span className="text-base font-black text-orange-400">Rs {Number(order.total).toLocaleString('en-IN')}</span>
                    <button
                      disabled={isDone}
                      onClick={() => advanceOrder(order.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-black text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                    >
                      {isDone ? <Check className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                      {isDone ? 'Delivered' : `Mark ${STATUS_FLOW[statusIndex + 1]}`}
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {STATUS_FLOW.map((status, index) => (
                    <div key={status} className="space-y-1">
                      <div className={`h-1.5 rounded-full ${index <= statusIndex ? 'bg-orange-500' : 'bg-zinc-800'}`} />
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500">
                        {status === 'Preparing' ? <Package className="h-3 w-3" /> : null}
                        {status}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
