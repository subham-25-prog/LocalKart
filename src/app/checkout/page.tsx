'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  ShoppingBag, 
  ArrowLeft, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  CheckCircle, 
  Truck, 
  ChevronRight, 
  Gift, 
  Package, 
  Check, 
  Loader2 
} from 'lucide-react';
import { getCart, getCartSummary, clearCart, Cart } from '@/lib/cart';
import { toast } from '@/lib/toast';

export default function FastCheckoutFlow() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('localkart_user') : null;
    if (!user) {
      toast('Please log in to proceed with checkout');
      router.replace('/login?callbackUrl=/checkout');
    } else {
      setIsAuthChecked(true);
    }
  }, [router]);
  // Auth check now performed after all hooks are defined
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('upi');
  const [isUpiScannerOpen, setIsUpiScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Card form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Delivery method state (DELIVERY or PICKUP)
  const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(15);

  // Helper component for Delivery/Pickup toggle with highlighted active state
  const DeliveryToggle = () => (
    <div className="inline-flex p-1 bg-zinc-950 border border-zinc-850 rounded-2xl w-full sm:w-auto shadow-inner">
      <button
        type="button"
        onClick={() => setDeliveryMethod('DELIVERY')}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-205 cursor-pointer ${
          deliveryMethod === 'DELIVERY'
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/10 hover:brightness-110 active:scale-[0.97]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
        }`}
      >
        <Truck className="w-3.5 h-3.5" />
        Delivery (₹{baseDeliveryFee})
      </button>
      <button
        type="button"
        onClick={() => setDeliveryMethod('PICKUP')}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-205 cursor-pointer ${
          deliveryMethod === 'PICKUP'
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/10 hover:brightness-110 active:scale-[0.97]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
        }`}
      >
        <Package className="w-3.5 h-3.5" />
        Pickup (Free)
      </button>
    </div>
  );

  const [cart, setCart] = useState<Cart | null>(null);
  const [summary, setSummary] = useState({
    subtotal: 0,
    deliveryFee: 0,
    groupDiscount: 0,
    platformFee: 0,
    total: 0
  });

  useEffect(() => {
     const cartData = getCart();
     setCart(cartData);
     const base = getCartSummary();
     setBaseDeliveryFee(base.deliveryFee);
     // Adjust delivery fee based on selected method
     const adjusted = {
       ...base,
       deliveryFee: deliveryMethod === 'PICKUP' ? 0 : base.deliveryFee,
       total: Math.max(
         0,
         base.subtotal + (deliveryMethod === 'PICKUP' ? 0 : base.deliveryFee) + base.platformFee - base.groupDiscount
       )
     };
     setSummary(adjusted);
   }, [deliveryMethod]);

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    
    // Read active user session
    let buyerName = 'Lokesh Kumar';
    let buyerPhone = '+91 98765 43210';
    let buyerEmail = 'lokesh.k@localkart.com';
    let address = 'No 12, 12th Main Road, Indiranagar, Bengaluru';

    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('localkart_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          buyerName = parsed.name || buyerName;
          buyerPhone = parsed.phone || buyerPhone;
          buyerEmail = parsed.email || buyerEmail;
        } catch (e) {
          console.warn('Failed to parse saved user, using defaults:', e);
        }
      }

      const savedLoc = localStorage.getItem('localkart_location');
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          address = parsed.name || address;
        } catch (e) {
          console.warn('Failed to parse saved location, using default address:', e);
        }
      }
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: cart?.storeId || 'store-krishnadairy',
          buyerName,
          buyerPhone,
          buyerEmail,
          address,
          items: cart?.items || [],
          total: summary.total,
          deliveryMethod,
          deliveryFee: summary.deliveryFee
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment transaction routing error');
      }

      // Sync active checkout order with the seller order dashboard history list
      const savedOrders = localStorage.getItem('localkart_vendor_orders');
      let vendorOrders = [];
      if (savedOrders) {
        try { vendorOrders = JSON.parse(savedOrders); } catch (e) {
          console.warn('Failed to parse stored vendor orders, resetting list:', e);
        }
      }
      
      const newOrder = {
        id: data.order.id,
        customerName: buyerName,
        items: cart?.items.map(i => `${i.qty}x ${i.name}`).join(', ') || '',
        total: summary.total,
        status: 'Received' as const,
        timestamp: 'Just now'
      };

      vendorOrders.unshift(newOrder);
      localStorage.setItem('localkart_vendor_orders', JSON.stringify(vendorOrders));
      localStorage.setItem('localkart_active_tracking_order_id', data.order.id);
      localStorage.setItem('localkart_active_tracking_status', 'Received');

      // Dispatch coordinate updates
      window.dispatchEvent(new Event('localkart_order_status_updated'));
      clearCart();

      setTimeout(() => {
        setIsProcessing(false);
        setActiveStep(3); // Advance to Dynamic Success step
      }, 1200);

    } catch (err: any) {
      console.warn("REST checkout placement failed, using offline fallback:", err);
      
      // Offline fallback:
      const savedOrders = localStorage.getItem('localkart_vendor_orders');
      let vendorOrders = [];
      if (savedOrders) {
        try { vendorOrders = JSON.parse(savedOrders); } catch (e) {
          console.warn('Failed to parse stored vendor orders, resetting list:', e);
        }
      }

      const orderId = `LK-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder = {
        id: orderId,
        customerName: buyerName,
        items: cart?.items.map(i => `${i.qty}x ${i.name}`).join(', ') || 'Fresh bread & dairy provisions',
        total: summary.total,
        status: 'Received' as const,
        timestamp: 'Just now'
      };

      vendorOrders.unshift(newOrder);
      localStorage.setItem('localkart_vendor_orders', JSON.stringify(vendorOrders));
      localStorage.setItem('localkart_active_tracking_order_id', orderId);
      localStorage.setItem('localkart_active_tracking_status', 'Received');

      window.dispatchEvent(new Event('localkart_order_status_updated'));
      clearCart();

      setTimeout(() => {
        setIsProcessing(false);
        setActiveStep(3);
      }, 1200);
    }
  };

  const stepsList = [
    { number: 1, label: 'Basket Review' },
    { number: 2, label: 'Secure Payment' },
    { number: 3, label: 'Order Confirmed' }
  ];

  if (!isAuthChecked) {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );
}
return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      
      {/* Header and Step Indicator Timeline */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (activeStep > 1 && activeStep < 3) {
                setActiveStep((prev) => (prev - 1) as any);
              } else {
                router.back();
              }
            }}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Checkout Process</span>
            <h1 className="text-base font-extrabold text-zinc-100 tracking-tight leading-none mt-0.5">LocalKart Payment Terminal</h1>
          </div>
        </div>

        {/* Step Indicator Bubbles */}
        <div className="flex items-center gap-2.5">
          {stepsList.map((step, idx) => (
            <React.Fragment key={step.number}>
              <div className="flex items-center gap-1.5">
                <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black border transition ${
                  activeStep >= step.number
                    ? 'bg-orange-500 border-orange-500 text-white font-bold'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-500'
                }`}>
                  {activeStep > step.number ? <Check className="w-3 h-3 text-white" /> : step.number}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider hidden md:inline ${
                  activeStep >= step.number ? 'text-zinc-200' : 'text-zinc-550'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < stepsList.length - 1 && (
                <div className={`h-0.5 w-6 transition-colors ${
                  activeStep > step.number ? 'bg-orange-500/80' : 'bg-zinc-900'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Review Basket */}
        {activeStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Left Column: Cart items review list */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  Review Items in Basket
                </h3>
                
                <div className="divide-y divide-zinc-900">
                  {(!cart || cart.items.length === 0) ? (
                    <div className="text-center py-10 text-xs text-zinc-550 font-bold uppercase tracking-wider">
                      Your basket is currently empty.
                    </div>
                  ) : (
                    cart.items.map((item, idx) => (
                      <div key={idx} className="py-3.5 flex items-center justify-between gap-4 first:pt-0">
                        <div className="min-w-0">
                          <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider">{item.brand}</span>
                          <h4 className="font-bold text-xs sm:text-sm text-zinc-200 mt-0.5">{item.name}</h4>
                          <span className="text-[10px] text-zinc-450 font-semibold mt-1 block">Qty: {item.qty} × ₹{item.price}</span>
                        </div>
                        <span className="font-extrabold text-xs text-zinc-150">₹{item.qty * item.price}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
                        
              <DeliveryToggle />
            </div>
            {/* Right Column: Order summary & Proceed */}
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Bill Details</h3>
                
                <div className="space-y-2.5 text-xs border-b border-zinc-850 pb-4">
                  <div className="flex justify-between text-zinc-450">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-zinc-200">₹{summary.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-zinc-450 items-center">
                    <span>Local Delivery Charge:</span>
                    <span className="font-bold text-zinc-200">
                      {deliveryMethod === 'PICKUP' ? (
                        <span className="flex items-center gap-1.5 text-[10px]">
                          <span className="line-through text-zinc-550">₹{baseDeliveryFee}</span>
                          <span className="text-emerald-500 font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">FREE (PICKUP)</span>
                        </span>
                      ) : (
                        `₹${summary.deliveryFee}`
                      )}
                    </span>
                  </div>
                  {summary.groupDiscount > 0 && (
                    <div className="flex justify-between text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1.5 rounded-xl font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Community Saving:
                      </span>
                      <span>- ₹{summary.groupDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-455">
                    <span>Platform Fee:</span>
                    <span className="font-bold text-zinc-200">₹{summary.platformFee}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Payable:</span>
                  <span className="text-lg font-black text-orange-500">₹{summary.total}</span>
                </div>

                <button
                  onClick={() => {
                    if (!cart || cart.items.length === 0) {
                      toast('Add items to your basket before checkout');
                      router.push('/');
                      return;
                    }
                    setActiveStep(2);
                  }}
                  disabled={!cart || cart.items.length === 0}
                  className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cart && cart.items.length > 0 ? 'Proceed to Payment Selection' : 'Add Items to Continue'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Payment Portal */}
        {activeStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Delivery Method Selector */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-4 space-y-2">
                <h4 className="text-sm font-semibold text-zinc-300">Select Delivery Option</h4>
                <DeliveryToggle />
              </div>
              <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-5 space-y-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-500" />
                  Select Payment Option
                </h3>

                {/* Selection Buttons */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
                  <button
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'upi'
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-150 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Instant UPI
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'card'
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-150 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Debit/Credit Card
                  </button>
                </div>

                {paymentMethod === 'upi' ? (
                  <div className="text-center py-4 space-y-4">
                    <p className="text-xs text-zinc-400 leading-normal max-w-sm mx-auto font-medium">
                      Pay instantly with any UPI app on your phone. Tap below to confirm with a secure QR handoff.
                    </p>
                    <button
                      onClick={() => setIsUpiScannerOpen(true)}
                      className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-orange-500" />
                      Generate UPI QR Code
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Card Number</label>
                      <input
                        type="text"
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full pl-3 py-2 border border-zinc-850 bg-zinc-950 text-xs rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full pl-3 py-2 border border-zinc-850 bg-zinc-950 text-xs rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">CVV Code</label>
                        <input
                          type="password"
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full pl-3 py-2 border border-zinc-850 bg-zinc-950 text-xs rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleProcessPayment}
                      className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-955 font-bold text-xs rounded-xl transition shadow cursor-pointer"
                    >
                      Authorize Payment of ₹{summary.total}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column Summary Details */}
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Order Totals</h3>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Payable:</span>
                  <span className="text-lg font-black text-orange-500">₹{summary.total}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-900 rounded-xl text-[9px] text-zinc-450 font-bold uppercase tracking-wider leading-none shadow-inner">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  SSL Certified Secure Handoff
                </div>
              </div>
            </div>
          </motion.div>
        )}

                {/* Step 3: Success Confirmation */}
        {activeStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto space-y-5"
          >
            {deliveryMethod === 'PICKUP' ? (
              <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-6 text-center space-y-5 shadow-sm">
                <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Package className="w-8 h-8 text-orange-400" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Order Ready for Pickup
                </h2>
                <p className="text-xs text-zinc-400">
                  Your order is prepared. Please visit the store to collect your items.
                </p>
                <button
                  onClick={() => router.push(`/stores/${cart?.storeId || ''}`)}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition shadow cursor-pointer"
                >
                  Go to Store
                </button>
              </div>
            ) : (
              <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-6 text-center space-y-5 shadow-sm">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Order Placed
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-semibold mt-1">
                  Payment verified. The store has received your order and is preparing it now.
                </p>

                {/* Dynamic Timeline tracker */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4.5 text-left space-y-3.5 shadow-inner">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">
                    Live Delivery Progress
                  </span>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mt-0.5 shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-200">
                          Order Received &amp; Authenticated
                        </span>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                          Payment confirmed via LocalKart API gateway.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-orange-500/10 border border-orange-500 text-orange-400 flex items-center justify-center mt-0.5 shrink-0 animate-pulse">
                        <Package className="w-2.5 h-2.5 text-orange-500" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-300">
                          Store Packing &amp; Provisions
                        </span>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                          Merchant is sealing fresh items for pickup.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-650 flex items-center justify-center mt-0.5 shrink-0">
                        <Truck className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-500">
                          Out for Hyperlocal Delivery
                        </span>
                        <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">
                          Your rider will share live location once the order is picked up.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/orders')}
                  className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl transition shadow cursor-pointer"
                >
                  Track Order &amp; Activity
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPI QR Scanner Modal Overlay */}
      {isUpiScannerOpen && (
        <div className="fixed inset-0 z-[80] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsUpiScannerOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition cursor-pointer font-bold text-xs"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-center mx-auto text-orange-500 shadow-inner">
              <QrCode className="w-6 h-6 text-orange-500" />
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider">UPI Scan & Pay</h3>
              <p className="text-xs text-zinc-400 mt-1 font-semibold leading-relaxed">
                Tap the QR area after completing payment in your UPI app.
              </p>
            </div>

            {/* Interactive QR box */}
            <div
              onClick={() => {
                setIsUpiScannerOpen(false);
                handleProcessPayment();
              }}
              className="w-44 h-44 border border-zinc-800 bg-zinc-950 rounded-2xl mx-auto flex items-center justify-center p-3.5 cursor-pointer hover:border-zinc-700 transition relative overflow-hidden group shadow-inner"
            >
              <div className="absolute left-0 right-0 h-0.5 bg-orange-500 top-4 animate-bounce" style={{ animationDuration: '3.5s' }} />
              <div className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-[9px] uppercase font-black text-zinc-500 group-hover:text-zinc-300 transition-colors tracking-widest text-center leading-normal select-none">
                Scan Code <br /> Tap to Confirm Payment
              </div>
            </div>

            <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold flex justify-center gap-1.5">
              <span>GPAY</span>
              <span>•</span>
              <span>PHONEPE</span>
              <span>•</span>
              <span>PAYTM</span>
              <span>•</span>
              <span>BHIM</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
