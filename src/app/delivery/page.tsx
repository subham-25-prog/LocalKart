'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation, ArrowLeft, Clock, CheckCircle, Send, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'rider';
  text: string;
  time: string;
}

export default function OrderDeliveryTracking() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'rider', text: 'Hi! I am Sunil, your LocalKart delivery rider. I am heading to Fresh Mart Supermarket to pick up your order.', time: 'Just now' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [orderId, setOrderId] = useState('LK-9481');
  const [address, setAddress] = useState('Indiranagar Gate');

  // Dynamic order tracking status synchronizer
  useEffect(() => {
    const syncStatus = () => {
      const activeStatus = localStorage.getItem('localkart_active_tracking_status') || 'Received';
      switch (activeStatus) {
        case 'Received':
          setActiveStep(1);
          break;
        case 'Preparing':
          setActiveStep(2);
          break;
        case 'Dispatched':
          setActiveStep(3);
          break;
        case 'Delivered':
          setActiveStep(4);
          break;
        default:
          setActiveStep(1);
      }

      const savedOrderId = localStorage.getItem('localkart_active_tracking_order_id');
      if (savedOrderId) {
        setOrderId(savedOrderId);
      }
      const savedLoc = localStorage.getItem('localkart_location');
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          setAddress(parsed.name || 'Indiranagar Gate');
        } catch (e) {}
      }
    };

    syncStatus();
    window.addEventListener('localkart_order_status_updated', syncStatus);

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'localkart_active_tracking_status' ||
        e.key === 'localkart_active_tracking_order_id' ||
        e.key === 'localkart_location'
      ) {
        syncStatus();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('localkart_order_status_updated', syncStatus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Chat scroll anchor
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput.trim(),
      time: 'Just now'
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    // Simulated automated rider reply after 1.5s
    setTimeout(() => {
      const riderReplies = [
        "Sure, got it! Will check with the store manager about this.",
        "Yes, I have reached the shop. They are packing your items right now.",
        "On my way! Traffic is clear, should reach your gate in 5 minutes.",
        "I have arrived at your building lobby. Let me know where to leave it."
      ];
      const randomReply = riderReplies[Math.min(activeStep, riderReplies.length - 1)];
      const riderMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'rider',
        text: randomReply,
        time: 'Just now'
      };
      setChatMessages((prev) => [...prev, riderMsg]);
    }, 1500);
  };

  const steps = [
    { label: 'Payment Success', desc: 'Secure hyperlocal checkout complete' },
    { label: 'Merchant Packing', desc: 'Fresh Mart Supermarket is preparing items' },
    { label: 'Rider Dispatched', desc: 'Sunil is on the way to your location' },
    { label: 'Order Delivered', desc: 'Enjoy your hyperlocal products!' }
  ];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Sub-header navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/')}
          className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
          Marketplace / <span className="text-zinc-350 font-bold">Live Delivery Tracker</span>
        </div>
      </div>

      {/* Main Delivery Info and Simulator Indicator Banner - Quiet Luxury style */}
      <section className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12">
          <Navigation className="w-64 h-64 text-zinc-700" />
        </div>
        <div className="max-w-xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-450 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            Estimated Arrival: 12 Mins
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-zinc-50">
            Order #{orderId} <br />
            <span className="text-orange-500">On Its Way to {address.split(',')[0]}</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
            Real-time delivery simulator. Check Sunil&apos;s dispatch stages and coordinate location handoffs directly.
          </p>
        </div>
      </section>

      {/* Grid: Left Column Tracker visual progression, Right Column Rider live chat console */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Progress checklist tracker */}
        <div className="md:col-span-2 space-y-4">
          <div className="matte-card rounded-2xl p-5 border border-zinc-800 space-y-5 shadow-sm relative">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <CheckCircle className="w-4.5 h-4.5 text-zinc-400 shrink-0" />
              Delivery Progress Tracker
            </h3>

            {/* Steps graphics */}
            <div className="relative pl-6.5 space-y-5 pt-1 border-l-2 border-zinc-900 ml-3">
              {steps.map((step, idx) => {
                const isCompleted = idx < activeStep;
                const isCurrent = idx === activeStep;

                return (
                  <div key={idx} className="relative">
                    {/* Circle Node */}
                    <span className={`absolute -left-10 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shadow transition-all ${
                      isCompleted
                        ? 'bg-zinc-100 border-zinc-300 text-zinc-950 shadow-sm'
                        : isCurrent
                        ? 'bg-zinc-900 border-orange-500 text-orange-500'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                    }`}>
                      {idx + 1}
                    </span>

                    {/* Step texts */}
                    <div>
                      <h4 className={`font-bold text-xs sm:text-sm ${
                        isCompleted || isCurrent ? 'text-zinc-100' : 'text-zinc-500'
                      }`}>
                        {step.label}
                      </h4>
                      <p className={`text-[10px] sm:text-xs mt-0.5 font-medium ${
                        isCompleted || isCurrent ? 'text-zinc-400' : 'text-zinc-650'
                      }`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Chat Console */}
        <div className="space-y-4">
          <div className="matte-card rounded-2xl p-4.5 border border-zinc-800 flex flex-col h-[400px] justify-between shadow-sm relative">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 pb-3 border-b border-zinc-850">
              <MessageSquare className="w-4.5 h-4.5 text-zinc-400 shrink-0" />
              Chat with सुनील (Rider)
            </h3>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto space-y-3.5 my-3.5 pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{isUser ? 'You' : 'Sunil (Delivery Partner)'}</span>
                    <div className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed font-semibold shadow-sm ${
                      isUser
                        ? 'bg-zinc-100 text-zinc-950 rounded-tr-none'
                        : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] font-semibold text-zinc-600 mt-1">{msg.time}</span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-zinc-850">
              <input
                type="text"
                placeholder="Ask rider to drop at security..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-800 bg-zinc-950 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-700/80 text-xs rounded-xl text-zinc-250 placeholder-zinc-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-xl transition-all shadow shrink-0 cursor-pointer flex items-center justify-center"
              >
                <Send className="w-4 h-4 shrink-0" />
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
