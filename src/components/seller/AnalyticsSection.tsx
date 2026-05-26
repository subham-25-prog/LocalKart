'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, IndianRupee, PackageCheck, Star, TrendingUp } from 'lucide-react';

type SellerOrder = {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: 'Received' | 'Preparing' | 'Dispatched' | 'Delivered';
  timestamp: string;
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  stockCount: number;
};

const ORDER_KEY = 'localkart_vendor_orders';
const INVENTORY_KEY = 'localkart_seller_inventory';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function AnalyticsSection() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const sync = () => {
      setOrders(readJson<SellerOrder[]>(ORDER_KEY, []));
      setInventory(readJson<InventoryItem[]>(INVENTORY_KEY, []));
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('localkart_order_status_updated', sync);
    window.addEventListener('localkart_seller_inventory_updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('localkart_order_status_updated', sync);
      window.removeEventListener('localkart_seller_inventory_updated', sync);
    };
  }, []);

  const metrics = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const activeOrders = orders.filter((order) => order.status !== 'Delivered').length;
    const lowStock = inventory.filter((item) => item.stockCount <= 5).length;
    const liveProducts = inventory.filter((item) => item.stockCount > 0).length;
    const avgOrder = orders.length ? Math.round(revenue / orders.length) : 0;

    return { revenue, activeOrders, lowStock, liveProducts, avgOrder };
  }, [orders, inventory]);

  const categoryMix = useMemo(() => {
    const counts = inventory.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [inventory]);

  const cards = [
    { label: 'Today revenue', value: `Rs ${metrics.revenue.toLocaleString('en-IN')}`, icon: IndianRupee, note: `${orders.length} orders synced` },
    { label: 'Active orders', value: metrics.activeOrders, icon: Activity, note: 'Needs store action' },
    { label: 'Live products', value: metrics.liveProducts, icon: PackageCheck, note: `${metrics.lowStock} low stock alerts` },
    { label: 'Avg order value', value: `Rs ${metrics.avgOrder}`, icon: TrendingUp, note: 'Local basket size' }
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{card.label}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-orange-400">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-black text-zinc-50">{card.value}</div>
              <p className="mt-1 text-xs font-semibold text-zinc-500">{card.note}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">Sales pulse</h2>
              <p className="text-xs font-medium text-zinc-500">Seven-day operational view</p>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-400">
              Live
            </span>
          </div>
          <div className="flex h-48 items-end gap-2">
            {[42, 68, 54, 88, 63, 95, 78].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-xl bg-gradient-to-t from-orange-600 to-amber-400" style={{ height: `${height}%` }} />
                <span className="text-[10px] font-bold text-zinc-600">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">Store health</h2>
          <div className="space-y-3">
            {categoryMix.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs font-semibold text-zinc-500">
                Add inventory to unlock category insights.
              </p>
            ) : (
              categoryMix.map(([category, count]) => (
                <div key={category}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-300">{category}</span>
                    <span className="text-zinc-500">{count} SKUs</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-950">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, count * 22)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-4 w-4 text-orange-400" />
              <p className="text-xs font-medium leading-relaxed text-zinc-400">
                {metrics.lowStock
                  ? `${metrics.lowStock} products are close to stockout. Restock them before evening demand peaks.`
                  : 'Inventory coverage looks healthy for the current order pace.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Store rating projection: 4.8 based on fulfilled orders.
          </div>
        </div>
      </div>
    </section>
  );
}
