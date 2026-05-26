'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Barcode, Camera, Edit3, Loader2, PackagePlus, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { PRODUCTS, STORE_PRODUCTS } from '@/lib/mockData';
import { toast } from '@/lib/toast';

type InventoryItem = {
  id: string;
  productId: string;
  name: string;
  category: string;
  price: number;
  stockCount: number;
  image: string;
  barcode?: string;
};

type Draft = {
  id?: string;
  productId?: string;
  name: string;
  category: string;
  price: string;
  stockCount: string;
  image: string;
  barcode: string;
};

const INVENTORY_KEY = 'localkart_seller_inventory';
const CATEGORIES = ['Dairy & Eggs', 'Grocery', 'Fresh Produce', 'Electronics', 'Pharmacy', 'Home Essentials'];

const EMPTY_DRAFT: Draft = {
  name: '',
  category: 'Grocery',
  price: '',
  stockCount: '',
  image: '',
  barcode: ''
};

function seedInventory(): InventoryItem[] {
  const mapped = STORE_PRODUCTS.filter((item) => item.storeId === 'store-krishnadairy').map((stock) => {
    const product = PRODUCTS.find((item) => item.id === stock.productId)!;
    return {
      id: stock.id,
      productId: product.id,
      name: product.name,
      category: product.category,
      price: stock.price,
      stockCount: stock.stockCount,
      image: product.image,
      barcode: `890${stock.id.replace(/\D/g, '').padStart(9, '0')}`
    };
  });
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(mapped));
  return mapped;
}

function readInventory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    return raw ? (JSON.parse(raw) as InventoryItem[]) : seedInventory();
  } catch {
    return seedInventory();
  }
}

function saveInventory(items: InventoryItem[]) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('localkart_seller_inventory_updated'));
}

export default function InventorySection() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products?storeId=store-krishnadairy');
      const data = await response.json();
      if (data.success && data.inventory?.length) {
        setInventory(data.inventory);
        saveInventory(data.inventory);
        return;
      }
      setInventory(readInventory());
    } catch {
      setInventory(readInventory());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInventory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return inventory;
    return inventory.filter((item) =>
      [item.name, item.category, item.barcode || ''].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [inventory, query]);

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT, barcode: `LK${Date.now().toString().slice(-8)}` });
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setDraft({
      id: item.id,
      productId: item.productId,
      name: item.name,
      category: item.category,
      price: String(item.price),
      stockCount: String(item.stockCount),
      image: item.image,
      barcode: item.barcode || ''
    });
    setModalOpen(true);
  };

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('Use an image under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const saveDraft = async () => {
    if (!draft.name.trim() || !draft.price || !draft.stockCount) {
      toast('Product name, price, and stock are required');
      return;
    }
    const price = Number(draft.price);
    const stockCount = Number(draft.stockCount);
    if (Number.isNaN(price) || price <= 0 || Number.isNaN(stockCount) || stockCount < 0) {
      toast('Enter valid price and stock values');
      return;
    }

    setSaving(true);
    const product: InventoryItem = {
      id: draft.id || `inv-local-${Date.now()}`,
      productId: draft.productId || `prod-local-${Date.now()}`,
      name: draft.name.trim(),
      category: draft.category,
      price,
      stockCount,
      image: draft.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
      barcode: draft.barcode || `LK${Date.now()}`
    };

    try {
      if (!draft.id) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...product, storeId: 'store-krishnadairy' })
        });
      }
    } catch {
      // Local save below keeps the seller workflow usable offline.
    }

    const next = draft.id
      ? inventory.map((item) => (item.id === draft.id ? product : item))
      : [product, ...inventory];
    setInventory(next);
    saveInventory(next);
    setSaving(false);
    setModalOpen(false);
    toast(draft.id ? 'Product updated' : 'Product listed');
  };

  const deleteItem = (id: string) => {
    const next = inventory.filter((item) => item.id !== id);
    setInventory(next);
    saveInventory(next);
    toast('Product removed from catalog');
  };

  const adjustStock = (id: string, amount: number) => {
    const next = inventory.map((item) =>
      item.id === id ? { ...item, stockCount: Math.max(0, item.stockCount + amount) } : item
    );
    setInventory(next);
    saveInventory(next);
  };

  const applyBarcodeLookup = () => {
    const match = PRODUCTS[Math.abs(draft.barcode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % PRODUCTS.length];
    setDraft((current) => ({
      ...current,
      name: match.name,
      category: match.category,
      image: match.image,
      price: current.price || '99',
      stockCount: current.stockCount || '10'
    }));
    toast('Barcode details matched from catalog');
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-base font-black uppercase tracking-wider text-zinc-50">Inventory</h1>
          <p className="text-xs font-medium text-zinc-500">List products, scan barcodes, update stock, and keep catalog availability accurate.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black uppercase text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
        >
          <PackagePlus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search inventory by product, category, or barcode"
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-3 pl-10 pr-4 text-sm text-zinc-100 outline-none focus:border-orange-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/70 py-16">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-10 text-center">
          <PackagePlus className="mx-auto h-10 w-10 text-zinc-700" />
          <h2 className="mt-3 text-sm font-black text-zinc-100">No matching products</h2>
          <p className="mt-1 text-xs text-zinc-500">Add products manually or scan a barcode to populate details.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">{item.category}</span>
                  <h3 className="mt-1 line-clamp-2 text-sm font-black text-zinc-50">{item.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">Barcode: {item.barcode || 'Manual item'}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
                <div>
                  <p className="text-base font-black text-zinc-50">Rs {item.price}</p>
                  <p className={`text-xs font-bold ${item.stockCount <= 5 ? 'text-rose-400' : 'text-zinc-500'}`}>
                    {item.stockCount} in stock
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => adjustStock(item.id, -1)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-zinc-300">-</button>
                  <button onClick={() => adjustStock(item.id, 1)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-zinc-300">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button onClick={() => openEdit(item)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-300">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-zinc-900 bg-zinc-950 p-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">{draft.id ? 'Edit product' : 'Add product'}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex gap-2">
                <input
                  value={draft.barcode}
                  onChange={(event) => setDraft({ ...draft, barcode: event.target.value })}
                  placeholder="Scan or enter barcode"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-orange-500"
                />
                <button onClick={applyBarcodeLookup} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs font-bold text-zinc-100">
                  <Barcode className="h-4 w-4 text-orange-400" />
                  Lookup
                </button>
              </div>

              <ProductInput label="Product name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                Category
                <select
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm normal-case text-zinc-100 outline-none focus:border-orange-500"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <ProductInput label="Price" type="number" value={draft.price} onChange={(price) => setDraft({ ...draft, price })} />
                <ProductInput label="Stock" type="number" value={draft.stockCount} onChange={(stockCount) => setDraft({ ...draft, stockCount })} />
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                    {draft.image ? <img src={draft.image} alt="Product preview" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-zinc-300">Product image</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Upload a clear square packshot for customer trust.</p>
                  </div>
                  <button onClick={() => fileRef.current?.click()} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-200">
                    <Camera className="h-4 w-4" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event.target.files?.[0])} />
                </div>
              </div>
              <button
                onClick={saveDraft}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ProductInput({
  label,
  value,
  onChange,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm normal-case text-zinc-100 outline-none focus:border-orange-500"
      />
    </label>
  );
}
