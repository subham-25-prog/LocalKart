'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle, Navigation } from 'lucide-react';

interface OrderStatus {
  success: boolean;
  status?: string;
  error?: string;
}

export default function RiderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolved = use(params);
  const { id } = resolved;

  const [orderStatus, setOrderStatus] = useState<string>('Received');
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    // Load order ID from local storage (set during checkout)
    const storedId = localStorage.getItem('localkart_active_tracking_order_id');
    if (storedId) setOrderId(storedId);

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${id}/status`);
        const data: OrderStatus = await res.json();
        if (data.success && data.status) setOrderStatus(data.status);
      } catch (e) {
        console.warn('Failed to fetch rider status, using fallback', e);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const steps = [
    { label: 'Payment Success', desc: 'Secure hyperlocal checkout complete' },
    { label: 'Merchant Packing', desc: 'Store is preparing items' },
    { label: 'Rider Dispatched', desc: 'Rider is on the way' },
    { label: 'Order Delivered', desc: 'Enjoy your items!' }
  ];

  const activeStep = steps.findIndex(s => s.label.split(' ')[0] === orderStatus);

  return (
    <div className="space-y-6 pb-16 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-xs text-zinc-500 uppercase font-medium">Rider Tracking / <span className="font-bold text-zinc-200">{orderId}</span></div>
      </div>

      <section className="bg-zinc-900 text-white rounded-3xl p-6 border border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5">
          <Navigation className="w-64 h-64 text-zinc-700" />
        </div>
        <div className="max-w-xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-450">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            Live Rider Status: {orderStatus}
          </div>
          <h1 className="text-2xl font-bold text-zinc-50">Rider is {orderStatus.toLowerCase()}</h1>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="p-5 border border-zinc-800 rounded-2xl bg-zinc-900/60">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <CheckCircle className="w-4.5 h-4.5 text-zinc-400" /> Delivery Progress
            </h3>
            <div className="pl-6.5 space-y-5 pt-1 border-l-2 border-zinc-900 ml-3">
              {steps.map((step, idx) => {
                const isCompleted = idx < activeStep;
                const isCurrent = idx === activeStep;
                return (
                  <div key={idx} className="relative">
                    <span className={`absolute -left-10 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shadow transition-all ${
                      isCompleted
                        ? 'bg-zinc-100 border-zinc-300 text-zinc-950'
                        : isCurrent
                        ? 'bg-zinc-900 border-orange-500 text-orange-500'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                    }`}>{idx + 1}</span>
                    <div>
                      <h4 className={`font-bold text-xs sm:text-sm ${isCompleted || isCurrent ? 'text-zinc-100' : 'text-zinc-500'}`}>{step.label}</h4>
                      <p className={`text-[10px] sm:text-xs mt-0.5 font-medium ${isCompleted || isCurrent ? 'text-zinc-400' : 'text-zinc-650'}`}>{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
