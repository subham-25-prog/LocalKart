'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Brain, Sun, Flame, Apple, Heart, Navigation, ArrowLeft } from 'lucide-react';
import { PRODUCTS, STORES } from '@/lib/mockData';

export default function AIRecommendationsPage() {
  const router = useRouter();
  const [activeContext, setActiveContext] = useState<'weather' | 'gym' | 'dinner'>('weather');
  const [typingText, setTypingText] = useState('');
  const [savedProducts, setSavedProducts] = useState<string[]>([]);

  useEffect(() => {
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('localkart_saved_products');
        if (saved) {
          try {
            setSavedProducts(JSON.parse(saved));
          } catch (e) {
            console.error(e);
          }
        }
      }
    }, 0);
  }, []);

  const toggleSaveProduct = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (savedProducts.includes(productId)) {
      updated = savedProducts.filter((id) => id !== productId);
    } else {
      updated = [...savedProducts, productId];
    }
    setSavedProducts(updated);
    localStorage.setItem('localkart_saved_products', JSON.stringify(updated));
  };

  const aiInsights = {
    weather: "It's currently hot and humid in Indiranagar. I recommend Farm Fresh Organic Bananas and Cold Amul Taaza Milk from Sri Krishna Dairy to keep you cool and hydrated today.",
    gym: "Post-workout energy needed! I suggest Farm Fresh White Eggs (Strip of 12) packed with protein, paired with English Oven Whole Wheat Bread from Fresh Mart Supermarket.",
    dinner: "Quick Dinner mode: India Gate Basmati Premium Rice and fresh ingredients from Krishna Dairy are ready. You can cook a delicious local biryani in under 20 minutes."
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    setTimeout(() => {
      setTypingText('');
      let idx = 0;
      const target = aiInsights[activeContext];
      timer = setInterval(() => {
        setTypingText((prev) => prev + target.charAt(idx));
        idx++;
        if (idx >= target.length) {
          clearInterval(timer);
        }
      }, 15);
    }, 0);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeContext]);

  const recommendedItems = {
    weather: [
      { id: 'prod-banana', name: 'Robusta Organic Bananas', price: 48, store: 'Organic Harvest Co.', dist: 0.8, logo: 'https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=100', rating: 4.7, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
      { id: 'prod-milk', name: 'Amul Taaza Fresh Milk (1L)', price: 30, store: 'Sri Krishna Dairy', dist: 0.4, logo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=100', rating: 4.8, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' }
    ],
    gym: [
      { id: 'prod-eggs', name: 'Farm Fresh White Eggs (Pack of 12)', price: 80, store: 'Sri Krishna Dairy', dist: 0.4, logo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=100', rating: 4.8, image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400' },
      { id: 'prod-bread', name: 'English Oven Whole Wheat Bread', price: 40, store: 'Sri Krishna Dairy', dist: 0.4, logo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=100', rating: 4.8, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' }
    ],
    dinner: [
      { id: 'prod-rice', name: 'India Gate Basmati Rice (1kg)', price: 105, store: 'Super Save Hypermarket', dist: 1.2, logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100', rating: 4.2, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
      { id: 'prod-bread', name: 'English Oven Whole Wheat Bread', price: 41, store: 'Super Save Hypermarket', dist: 1.2, logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100', rating: 4.2, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' }
    ]
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Sub-header navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-350 hover:text-zinc-50 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
          AI Engine / <span className="text-zinc-350 font-bold">Personalized Feed</span>
        </div>
      </div>

      {/* Main AI Header Banner */}
      <section className="bg-zinc-900/60 rounded-3xl p-6 sm:p-8 border border-zinc-800/80 shadow-sm relative overflow-hidden flex flex-col items-start gap-3.5 animate-slide-up">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded bg-zinc-850 border border-zinc-700/50 text-[10px] font-bold text-zinc-350 uppercase tracking-wider shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
          AI Context Feed
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
          Context-Aware Local Commerce
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed max-w-xl">
          LocalKart AI analyzes real-time weather conditions, physical distances, and your context to suggest the most optimized local product matches.
        </p>
      </section>

      {/* Context Selection Pills */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-900 pb-3">
        <button
          onClick={() => setActiveContext('weather')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-premium cursor-pointer ${
            activeContext === 'weather'
              ? 'bg-zinc-850 text-zinc-50 border-zinc-750'
              : 'bg-zinc-900/20 border-zinc-800 text-zinc-450 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Sun className="w-4 h-4 text-orange-500" />
          Hot Weather Mode
        </button>

        <button
          onClick={() => setActiveContext('gym')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-premium cursor-pointer ${
            activeContext === 'gym'
              ? 'bg-zinc-850 text-zinc-50 border-zinc-750'
              : 'bg-zinc-900/20 border-zinc-800 text-zinc-450 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Flame className="w-4 h-4 text-orange-550" />
          Healthy Gym Mode
        </button>

        <button
          onClick={() => setActiveContext('dinner')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-premium cursor-pointer ${
            activeContext === 'dinner'
              ? 'bg-zinc-850 text-zinc-50 border-zinc-750'
              : 'bg-zinc-900/20 border-zinc-800 text-zinc-450 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Apple className="w-4 h-4 text-orange-500" />
          20 Min Quick Dinner
        </button>
      </div>

      {/* AI Assistant Console Screen */}
      <section className="glass-card rounded-2xl p-5 border border-zinc-900 relative overflow-hidden shadow">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 shadow-sm">
            <Brain className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-350 uppercase tracking-wider">AI Copilot</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-zinc-950 border border-zinc-850 rounded-full text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                Simulation Active
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-zinc-100 leading-relaxed min-h-[50px] font-mono">
              {typingText}
              <span className="inline-block w-1.5 h-4 bg-orange-500 ml-0.5" />
            </p>
          </div>
        </div>
      </section>

      {/* Recommended Products Feed */}
      <section className="space-y-3.5">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          AI Suggested Products Near You
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recommendedItems[activeContext].map((prod) => (
            <div
              key={prod.id}
              onClick={() => router.push(`/products/${prod.id}`)}
              className="glass-card rounded-2xl p-4 flex gap-4 cursor-pointer group hover:scale-[1.01] transition-premium relative overflow-hidden border-zinc-900"
            >
              {/* Product thumbnail */}
              <div className="w-24 h-24 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative p-2">
                <img src={prod.image} alt={prod.name} className="max-h-full max-w-full object-contain group-hover:scale-102 transition-transform" />
                <button
                  onClick={(e) => toggleSaveProduct(prod.id, e)}
                  className="absolute top-1.5 right-1.5 p-1 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-500 hover:text-red-500 border border-zinc-800 rounded z-10 cursor-pointer"
                >
                  <Heart className={`w-3 h-3 ${savedProducts.includes(prod.id) ? 'fill-red-500 text-red-500' : 'text-zinc-500'}`} />
                </button>
              </div>

              {/* Specs */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h4 className="font-bold text-zinc-200 text-xs sm:text-sm truncate group-hover:text-white transition">
                    {prod.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-5 h-5 rounded overflow-hidden shrink-0 border border-zinc-900">
                      <img src={prod.logo} alt={prod.store} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 truncate">{prod.store}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-900 pt-2.5 mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Price</span>
                    <span className="text-sm font-black text-orange-500">₹{prod.price}</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-350 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded-full shrink-0">
                    <Navigation className="w-3 h-3 shrink-0 text-orange-550" />
                    {prod.dist.toFixed(1)} km
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
