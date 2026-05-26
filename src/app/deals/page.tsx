'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Users, Clock, ArrowLeft, ArrowRight, Percent } from 'lucide-react';

interface GroupBuyDeal {
  id: string;
  name: string;
  originalPrice: number;
  dealPrice: number;
  joinedCount: number;
  targetCount: number;
  image: string;
  storeName: string;
  expiresIn: string;
}

export default function LocalDealsHub() {
  const router = useRouter();
  const [activeDeals, setActiveDeals] = useState<GroupBuyDeal[]>([
    {
      id: 'deal-rice',
      name: 'India Gate Basmati Rice Premium (1kg)',
      originalPrice: 110,
      dealPrice: 85,
      joinedCount: 7,
      targetCount: 10,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
      storeName: 'Fresh Mart Supermarket',
      expiresIn: '02h 45m'
    },
    {
      id: 'deal-headphones',
      name: 'Sony WH-CH520 Wireless Headphones',
      originalPrice: 4499,
      dealPrice: 3899,
      joinedCount: 4,
      targetCount: 5,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      storeName: 'Alpha Electronics',
      expiresIn: '05h 12m'
    }
  ]);

  const [tickingFlashSeconds, setTickingFlashSeconds] = useState(3600);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickingFlashSeconds((prev) => (prev > 0 ? prev - 1 : 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatFlashTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleJoinDeal = (dealId: string) => {
    setActiveDeals(
      activeDeals.map((deal) => {
        if (deal.id === dealId && deal.joinedCount < deal.targetCount) {
          return { ...deal, joinedCount: deal.joinedCount + 1 };
        }
        return deal;
      })
    );
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Sub-header navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
          Community / <span className="text-zinc-350 font-bold">Neighborhood Deals</span>
        </div>
      </div>

      {/* Main Deals Banner - Quiet Luxury style */}
      <section className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12">
          <Percent className="w-64 h-64 text-zinc-700" />
        </div>
        <div className="max-w-xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-450 shadow-inner">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            Neighborhood Group-Buys Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-zinc-50">
            Team up with your neighbors. <br />
            Unlock <span className="text-orange-500">wholesale local pricing.</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
            LocalKart Group-Buys pool shopping orders from nearby residents to help local physical shops clear excess stock and deliver bulk discounts.
          </p>
        </div>
      </section>

      {/* Grid: Left Column Group Buys, Right Column ticking Flash Discounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Group Buys */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            Active Indiranagar Group-Buys
          </h3>

          <div className="space-y-4">
            {activeDeals.map((deal) => {
              const progress = (deal.joinedCount / deal.targetCount) * 100;
              const isLocked = deal.joinedCount < deal.targetCount;
              return (
                <div
                  key={deal.id}
                  className="matte-card rounded-2xl p-5 border border-zinc-800 relative overflow-hidden flex flex-col sm:flex-row gap-5 shadow-sm group"
                >
                  {/* Thumbnail */}
                  <div className="w-full sm:w-28 aspect-square bg-zinc-950/40 border border-zinc-800/80 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-2">
                    <img src={deal.image} alt={deal.name} className="max-h-full max-w-full object-contain group-hover:scale-102 transition-transform duration-300" />
                  </div>

                  {/* Body details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-semibold text-zinc-100 text-sm sm:text-base truncate group-hover:text-orange-500 transition-colors">
                          {deal.name}
                        </h4>
                        <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-800/80 shrink-0 uppercase tracking-wider">
                          <Clock className="w-3 h-3 text-orange-500 shrink-0" />
                          {deal.expiresIn}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1 block">
                        Sold by: <span className="text-zinc-400">{deal.storeName}</span>
                      </span>
                    </div>

                    {/* Neighborhood slots progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-zinc-350 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                          {deal.joinedCount}/{deal.targetCount} Neighbors joined
                        </span>
                        <span className="text-zinc-500">
                          {isLocked ? `${deal.targetCount - deal.joinedCount} slots left` : 'Deal unlocked!'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/85">
                        <div
                          style={{ width: `${progress}%` }}
                          className="h-full bg-zinc-100 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Interactive Action block */}
                    <div className="flex items-end justify-between border-t border-zinc-800/80 pt-3 mt-2">
                      <div>
                        <span className="text-[8px] font-bold text-zinc-500 uppercase leading-none block">Wholesale Pricing</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-orange-500">₹{deal.dealPrice}</span>
                          <span className="text-xs text-zinc-500 line-through">₹{deal.originalPrice}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinDeal(deal.id)}
                        disabled={!isLocked}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                          isLocked
                            ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950'
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800 font-medium shadow-inner cursor-default'
                        }`}
                      >
                        {isLocked ? (
                          <>
                            Join Group Deal
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          'Deal Unlocked!'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Flash Countdown Deals */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            Ticking Flash Deals
          </h3>

          <div className="matte-card rounded-2xl p-5 border border-zinc-800 space-y-4 shadow-sm relative overflow-hidden">
            
            {/* Timer visual */}
            <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ends In:</span>
              <span className="text-sm font-mono font-bold text-orange-500 flex items-center gap-1">
                <Clock className="w-4 h-4 shrink-0" />
                {formatFlashTime(tickingFlashSeconds)}
              </span>
            </div>

            {/* Flash item cards */}
            <div className="space-y-3.5 divide-y divide-zinc-800/60">
              
              <div className="pt-3.5 first:pt-0 flex items-center gap-3.5 group">
                <div className="w-14 h-14 bg-zinc-950/40 border border-zinc-800/80 rounded-xl shrink-0 overflow-hidden flex items-center justify-center p-1">
                  <img src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200" alt="Amul Milk" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-zinc-100 text-xs truncate group-hover:text-orange-400 transition-colors">Amul Taaza Milk (1L)</h4>
                  <p className="text-[9px] text-orange-500 font-semibold bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">Save 40% (Surplus stock)</p>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xs font-black text-orange-500">₹19</span>
                    <span className="text-[9px] text-zinc-500 line-through">₹32</span>
                  </div>
                </div>
              </div>

              <div className="pt-3.5 flex items-center gap-3.5 group">
                <div className="w-14 h-14 bg-zinc-950/40 border border-zinc-800/80 rounded-xl shrink-0 overflow-hidden flex items-center justify-center p-1">
                  <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200" alt="English Bread" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-zinc-100 text-xs truncate group-hover:text-orange-400 transition-colors">English Oven Wheat Bread</h4>
                  <p className="text-[9px] text-orange-500 font-semibold bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">Expiry Clearance: 1 day left</p>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xs font-black text-orange-500">₹24</span>
                    <span className="text-[9px] text-zinc-500 line-through">₹40</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
