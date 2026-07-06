'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, ShoppingBag, Users, Star, CheckCircle, Clock, DollarSign, Plus, Minus,
  LayoutDashboard, ShoppingCart, Package, BarChart3, Settings, LogOut, Store, Loader2
} from 'lucide-react';
import { PRODUCTS, STORES, STORE_PRODUCTS } from '@/lib/mockData';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';
import { clearSession, getStoredUser } from '@/lib/auth';

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

export default function SellerPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role?: string; name: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'inventory' | 'customers' | 'settings'>('analytics');
  
  // Custom states
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // New Product Modal States
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Dairy & Eggs');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProdImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 150;
          canvas.height = 150;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 150, 150);
            setStoreLogo(canvas.toDataURL('image/jpeg', 0.8));
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 400, 200);
            setStoreBannerImage(canvas.toDataURL('image/jpeg', 0.8));
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (err) {
      console.warn('AudioContext beep failed to initialize:', err);
    }
  };

  // Store Profile Settings States
  const [storeName, setStoreName] = useState('Sri Krishna Dairy & Provisions');
  const [storeHandle, setStoreHandle] = useState('krishna-dairy');
  const [storeDescription, setStoreDescription] = useState('Daily dairy, pantry staples, and fast local delivery from Indiranagar.');
  const [storeLogo, setStoreLogo] = useState('https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=200&h=200&fit=crop');
  const [storeBannerImage, setStoreBannerImage] = useState('linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)');
  const [storePhone, setStorePhone] = useState('+91 98450 12345');
  const [storeAddress, setStoreAddress] = useState('No 12, 12th Main Rd, Doopanahalli, Indiranagar, Bengaluru');
  const [pickupLocation, setPickupLocation] = useState('Back gate pickup counter, 12th Main Road');
  const [businessCategory, setBusinessCategory] = useState('Dairy & Grocery');
  const [upiDetails, setUpiDetails] = useState('krishnadairy@upi');
  const [bankDetails, setBankDetails] = useState('HDFC Bank •••• 4231');
  const [gstNumber, setGstNumber] = useState('');
  const [socialLinks, setSocialLinks] = useState('@krishnadairyblr');
  const [storeOpenTime, setStoreOpenTime] = useState('06:00 AM');
  const [storeCloseTime, setStoreCloseTime] = useState('09:30 PM');
  const [storeIsOpenStatus, setStoreIsOpenStatus] = useState(true);
  const [storeTags, setStoreTags] = useState('Dairy, Grocery, Provisions');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Barcode Scanner Simulation States
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState('');

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/products?storeId=store-krishnadairy');
      const data = await res.json();
      if (data.success && data.inventory) {
        setInventory(data.inventory);
        return;
      }
    } catch (err) {
      console.warn("Database API fetch failed, falling back to localStorage inventory catalog:", err);
    }
    
    // Failover fallback layer
    const savedInv = localStorage.getItem('localkart_seller_inventory');
    if (savedInv) {
      try {
        setInventory(JSON.parse(savedInv));
      } catch (e) {
        console.warn('Failed to parse saved seller inventory:', e);
      }
    } else {
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
      localStorage.setItem('localkart_seller_inventory', JSON.stringify(mappedInventory));
      setInventory(mappedInventory);
    }
  };

  useEffect(() => {
    // Auth Check
    const currentUser = getStoredUser();
    setUser(currentUser);
    setAuthChecked(true);

    if (!currentUser || currentUser.role !== 'seller') {
      localStorage.setItem('localkart_trigger_login', 'true');
      router.replace('/login?role=seller&callbackUrl=/seller');
      return;
    }

    // Load orders from database / fallback local storage
    const fetchSellerOrders = async () => {
      try {
        const res = await fetch('/api/orders?storeId=store-krishnadairy');
        const data = await res.json();
        if (data.success && data.orders && data.orders.length > 0) {
          setOrders(data.orders);
          return;
        }
      } catch (e) {
        console.warn("Postgres seller orders API query failed. Fallback to localStorage.", e);
      }

      const savedOrders = localStorage.getItem('localkart_vendor_orders');
      if (savedOrders) {
        try {
          setOrders(JSON.parse(savedOrders));
        } catch (e) {
          console.warn('Failed to parse saved vendor orders:', e);
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
    };

    fetchSellerOrders();

    // Load database-driven inventory catalog
    fetchInventory();

    // Load store profile
    const savedProfile = localStorage.getItem('localkart_seller_store_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setStoreName(parsed.name || 'Sri Krishna Dairy & Provisions');
        setStoreHandle(parsed.handle || 'krishna-dairy');
        setStoreDescription(parsed.description || 'Daily dairy, pantry staples, and fast local delivery from Indiranagar.');
        setStoreLogo(parsed.logo || 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=200&h=200&fit=crop');
        setStoreBannerImage(parsed.banner || 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)');
        setStorePhone(parsed.phone || '+91 98450 12345');
        setStoreAddress(parsed.address || 'No 12, 12th Main Rd, Doopanahalli, Indiranagar, Bengaluru');
        setPickupLocation(parsed.pickupLocation || 'Back gate pickup counter, 12th Main Road');
        setBusinessCategory(parsed.businessCategory || parsed.tags || 'Dairy & Grocery');
        setUpiDetails(parsed.upiDetails || 'krishnadairy@upi');
        setBankDetails(parsed.bankDetails || 'HDFC Bank •••• 4231');
        setGstNumber(parsed.gstNumber || '');
        setSocialLinks(parsed.socialLinks || '@krishnadairyblr');
        setStoreOpenTime(parsed.openTime || '06:00 AM');
        setStoreCloseTime(parsed.closeTime || '09:30 PM');
        setStoreIsOpenStatus(parsed.isOpenStatus !== undefined ? parsed.isOpenStatus : true);
        setStoreTags(parsed.tags || 'Dairy, Grocery, Provisions');
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultProfile = {
        name: 'Sri Krishna Dairy & Provisions',
        handle: 'krishna-dairy',
        description: 'Daily dairy, pantry staples, and fast local delivery from Indiranagar.',
        logo: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=200&h=200&fit=crop',
        banner: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
        phone: '+91 98450 12345',
        address: 'No 12, 12th Main Rd, Doopanahalli, Indiranagar, Bengaluru',
        pickupLocation: 'Back gate pickup counter, 12th Main Road',
        businessCategory: 'Dairy & Grocery',
        upiDetails: 'krishnadairy@upi',
        bankDetails: 'HDFC Bank •••• 4231',
        gstNumber: '',
        socialLinks: '@krishnadairyblr',
        openTime: '06:00 AM',
        closeTime: '09:30 PM',
        isOpenStatus: true,
        tags: 'Dairy, Grocery, Provisions'
      };
      localStorage.setItem('localkart_seller_store_profile', JSON.stringify(defaultProfile));
    }
  }, []);

  const handleHardwareScan = async (code: string) => {
    if (activeTab !== 'inventory') return;

    playScanBeep();
    setIsAddProductOpen(true);
    setScannedBarcode(code);
    setScannedFeedback(`Looking up EAN ${code} in Database...`);

    const executeFallbackScan = (text: string) => {
      if (text.includes('890123') || text.includes('8901234567890')) {
        setNewProdName('Amul Taaza Fresh Milk (1L)');
        setNewProdCategory('Dairy & Eggs');
        setNewProdImage('https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop');
      } else if (text.includes('890456') || text.includes('8904567890123')) {
        setNewProdName('Cadbury Dairy Milk Silk Chocolate (150g)');
        setNewProdCategory('Grocery');
        setNewProdImage('https://images.unsplash.com/photo-1549007994-cb92ca85f36a?w=400&h=400&fit=crop');
      } else if (text.includes('890789') || text.includes('8907890123456')) {
        setNewProdName('Coca-Cola Diet Coke Zero Can (330ml)');
        setNewProdCategory('Grocery');
        setNewProdImage('https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop');
      } else if (text.includes('890111') || text.includes('8901112223334')) {
        setNewProdName('Crocin Pain Relief Tablet (Strip of 15)');
        setNewProdCategory('Pharmacy');
        setNewProdImage('https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=400&h=400&fit=crop');
      } else if (text.includes('890222') || text.includes('8902223334445')) {
        setNewProdName('English Oven Whole Wheat Bread (400g)');
        setNewProdCategory('Dairy & Eggs');
        setNewProdImage('https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop');
      } else {
        setNewProdName(`Product EAN-${text}`);
        setNewProdCategory('Grocery');
        setNewProdImage('https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop');
      }
    };

    try {
      const res = await fetch(`/api/products/scan/${code}`);
      const data = await res.json();

      if (data.success && data.product) {
        setNewProdName(data.product.name);
        setNewProdCategory(data.product.category);
        setNewProdImage(data.product.image);
        setScannedFeedback('SUCCESS! Product Matched!');
      } else {
        executeFallbackScan(code);
        setScannedFeedback('Product Matched from Local Catalog!');
      }
    } catch (err) {
      console.warn("Database lookup API failed, executing fallback EAN maps:", err);
      executeFallbackScan(code);
      setScannedFeedback('Product Matched from Local Catalog!');
    }

    setTimeout(() => {
      setScannedFeedback('');
      setTimeout(() => {
        const priceInput = document.getElementById('new-product-price');
        if (priceInput) priceInput.focus();
      }, 150);
    }, 800);
  };

  useHardwareScanner(handleHardwareScan);

  // Live Camera Barcode Scanner Effect Hook
  const scannerActiveRef = React.useRef(false);

  useEffect(() => {
    let html5QrCode: any = null;

    if (isScanning) {
      scannerActiveRef.current = true;
      setScannedFeedback('Accessing device camera stream...');
      
      import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
        const element = document.getElementById("barcode-scanner-viewport");
        if (!element) return;

        if (!scannerActiveRef.current) return;

        html5QrCode = new Html5Qrcode("barcode-scanner-viewport");
        
        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 30, // Optimized frame rate for fast recognition
            qrbox: (width: number, height: number) => {
              return {
                width: Math.min(width * 0.85, 320),
                height: Math.min(height * 0.4, 130) // Wide horizontal rectangular strip ideal for barcodes
              };
            },
            // Restrict scanning to common barcode formats to save CPU processing power
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39
            ],
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
          },
          async (decodedText: string) => {
            if (!scannerActiveRef.current) {
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(() => {});
              }
              return;
            }

            playScanBeep();
            setScannedFeedback(`Decoded EAN: ${decodedText} 🔊 [BEEP]`);
            setScannedBarcode(decodedText);

            const executeFallbackScan = (text: string) => {
              if (text.includes('890123') || text.includes('8901234567890')) {
                setNewProdName('Amul Taaza Fresh Milk (1L)');
                setNewProdCategory('Dairy & Eggs');
                setNewProdImage('https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop');
              } else if (text.includes('890456') || text.includes('8904567890123')) {
                setNewProdName('Cadbury Dairy Milk Silk Chocolate (150g)');
                setNewProdCategory('Grocery');
                setNewProdImage('https://images.unsplash.com/photo-1549007994-cb92ca85f36a?w=400&h=400&fit=crop');
              } else if (text.includes('890789') || text.includes('8907890123456')) {
                setNewProdName('Coca-Cola Diet Coke Zero Can (330ml)');
                setNewProdCategory('Grocery');
                setNewProdImage('https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop');
              } else if (text.includes('890111') || text.includes('8901112223334')) {
                setNewProdName('Crocin Pain Relief Tablet (Strip of 15)');
                setNewProdCategory('Pharmacy');
                setNewProdImage('https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=400&h=400&fit=crop');
              } else if (text.includes('890222') || text.includes('8902223334445')) {
                setNewProdName('English Oven Whole Wheat Bread (400g)');
                setNewProdCategory('Dairy & Eggs');
                setNewProdImage('https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop');
              } else {
                setNewProdName(`Product EAN-${text}`);
                setNewProdCategory('Grocery');
                setNewProdImage('https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop');
              }
            };

            try {
              setScannedFeedback(`Looking up EAN ${decodedText} in Database...`);
              const res = await fetch(`/api/products/scan/${decodedText}`);
              const data = await res.json();
              
              if (data.success && data.product) {
                setNewProdName(data.product.name);
                setNewProdCategory(data.product.category);
                setNewProdImage(data.product.image);
                setScannedFeedback('SUCCESS! Product Matched!');
              } else {
                executeFallbackScan(decodedText);
                setScannedFeedback('Product Matched from Local Catalog!');
              }
            } catch (err) {
              console.warn("Database lookup API failed, executing fallback EAN maps:", err);
              executeFallbackScan(decodedText);
              setScannedFeedback('Product Matched from Local Catalog!');
            }

            setTimeout(() => {
              setIsScanning(false);
              setScannedFeedback('');
              
              setTimeout(() => {
                const priceInput = document.getElementById('new-product-price');
                if (priceInput) priceInput.focus();
              }, 150);
            }, 800);
          },
          (errorMessage: string) => {
            // Silently ignore scanning frame errors
          }
        ).then(() => {
          if (!scannerActiveRef.current && html5QrCode) {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().catch(() => {});
            }
          }
        }).catch((err: any) => {
          console.error("html5-qrcode failed to start:", err);
          if (scannerActiveRef.current) {
            setScannedFeedback(`Camera Error: ${err.message || err}. Enable camera permissions.`);
          }
        });
      }).catch((e: any) => {
        console.error("Failed to load html5-qrcode dynamically:", e);
      });
    }

    return () => {
      scannerActiveRef.current = false;
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch((err: any) => {
            console.error("Failed to stop camera stream clean up:", err);
          });
        }
      }
    };
  }, [isScanning]);

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
 
    const updated = orders.map((ord) => ord.id === orderId ? { ...ord, status: nextStatus } : ord);
    setOrders(updated);
    localStorage.setItem('localkart_vendor_orders', JSON.stringify(updated));
    localStorage.setItem('localkart_active_tracking_status', nextStatus);
    window.dispatchEvent(new Event('localkart_order_status_updated'));
    setIsUpdating(false);
  };

  const handleUpdateStock = async (invId: string, amount: number) => {
    const item = inventory.find(i => i.id === invId);
    if (!item) return;
    const newStock = Math.max(0, item.stockCount + amount);

    try {
      const res = await fetch(`/api/products/${invId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockCount: newStock })
      });
      const data = await res.json();
      if (data.success) {
        fetchInventory();
        return;
      }
    } catch (err) {
      console.warn("Prisma PATCH request failed, updating local state directly:", err);
    }

    const updated = inventory.map((inv) => {
      if (inv.id === invId) {
        return { ...inv, stockCount: newStock };
      }
      return inv;
    });
    setInventory(updated);
    localStorage.setItem('localkart_seller_inventory', JSON.stringify(updated));
    window.dispatchEvent(new Event('localkart_inventory_updated'));
  };

  const handleUpdatePrice = async (invId: string, newPrice: number) => {
    const sanitizedPrice = Math.max(1, newPrice);

    try {
      const res = await fetch(`/api/products/${invId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: sanitizedPrice })
      });
      const data = await res.json();
      if (data.success) {
        fetchInventory();
        return;
      }
    } catch (err) {
      console.warn("Prisma PATCH request failed, updating local state directly:", err);
    }

    const updated = inventory.map((inv) => {
      if (inv.id === invId) {
        return { ...inv, price: sanitizedPrice };
      }
      return inv;
    });
    setInventory(updated);
    localStorage.setItem('localkart_seller_inventory', JSON.stringify(updated));
    window.dispatchEvent(new Event('localkart_inventory_updated'));
  };

  const handleExportData = () => {
    const reportData = {
      storeName: "Sri Krishna Dairy & Provisions",
      exportedAt: new Date().toISOString(),
      kpis: {
        grossSales: totalRevenue,
        activeOrders: activeOrdersCount,
        customerReach: 312,
        rating: 4.8
      },
      inventory: inventory,
      orders: orders
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `localkart_seller_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice || !newProdStock) {
      alert("Please fill in all required fields!");
      return;
    }

    const priceNum = parseFloat(newProdPrice) || 10;
    const stockNum = parseInt(newProdStock) || 10;
    const imageStr = newProdImage.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop';

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName.trim(),
          category: newProdCategory,
          price: priceNum,
          stockCount: stockNum,
          image: imageStr,
          barcode: scannedBarcode || undefined,
          storeId: 'store-krishnadairy'
        })
      });
      
      const data = await res.json();
      if (data.success && data.product) {
        fetchInventory();
        
        setNewProdName('');
        setNewProdPrice('');
        setNewProdStock('');
        setNewProdImage('');
        setScannedBarcode('');
        setIsAddProductOpen(false);
        return;
      }
    } catch (err) {
      console.warn("Prisma POST request failed, falling back to local registry registration:", err);
    }

    const newItem: InventoryItem = {
      id: `inv-custom-${Date.now()}`,
      productId: `prod-custom-${Date.now()}`,
      name: newProdName.trim(),
      category: newProdCategory,
      price: priceNum,
      stockCount: stockNum,
      image: imageStr
    };

    const updated = [...inventory, newItem];
    setInventory(updated);
    localStorage.setItem('localkart_seller_inventory', JSON.stringify(updated));
    window.dispatchEvent(new Event('localkart_inventory_updated'));

    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
    setNewProdImage('');
    setScannedBarcode('');
    setIsAddProductOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccessMsg('');

    setTimeout(() => {
      const profile = {
        name: storeName.trim(),
        handle: storeHandle.trim().replace(/^@/, '').toLowerCase(),
        description: storeDescription.trim(),
        logo: storeLogo.trim(),
        banner: storeBannerImage.trim(),
        phone: storePhone.trim(),
        address: storeAddress.trim(),
        pickupLocation: pickupLocation.trim(),
        businessCategory: businessCategory.trim(),
        upiDetails: upiDetails.trim(),
        bankDetails: bankDetails.trim(),
        gstNumber: gstNumber.trim(),
        socialLinks: socialLinks.trim(),
        openTime: storeOpenTime,
        closeTime: storeCloseTime,
        isOpenStatus: storeIsOpenStatus,
        tags: storeTags.trim()
      };
      localStorage.setItem('localkart_seller_store_profile', JSON.stringify(profile));
      
      // Update global context
      window.dispatchEvent(new Event('localkart_store_profile_updated'));
      
      setIsSavingSettings(false);
      setSaveSuccessMsg('Store settings saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }, 600);
  };

  const handleSimulateScan = (productKey: 'milk' | 'chocolate' | 'coke' | 'colgate' | 'lipton') => {
    setScannedFeedback('Initializing Simulated Viewport...');
    
    setTimeout(() => {
      setScannedFeedback('Reading EAN-13 Barcode Registry...');
      
      setTimeout(() => {
        setScannedFeedback('SUCCESS! EAN Match Found! 🔊 [BEEP]');
        playScanBeep();
        
        setTimeout(() => {
          switch (productKey) {
            case 'milk':
              setNewProdName('Amul Gold Premium Full Cream Milk (1L)');
              setNewProdCategory('Dairy & Eggs');
              setNewProdImage('https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop');
              break;
            case 'chocolate':
              setNewProdName('Cadbury Dairy Milk Silk Chocolate (150g)');
              setNewProdCategory('Grocery');
              setNewProdImage('https://images.unsplash.com/photo-1549007994-cb92ca85f36a?w=400&h=400&fit=crop');
              break;
            case 'coke':
              setNewProdName('Coca-Cola Diet Coke Zero Can (330ml)');
              setNewProdCategory('Grocery');
              setNewProdImage('https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop');
              break;
            case 'colgate':
              setNewProdName('Colgate MaxFresh Red Gel Paste (150g)');
              setNewProdCategory('Pharmacy');
              setNewProdImage('https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=400&h=400&fit=crop');
              break;
            case 'lipton':
              setNewProdName('Lipton Yellow Label Black Tea (100 Bags)');
              setNewProdCategory('Grocery');
              setNewProdImage('https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop');
              break;
          }
          
          setIsScanning(false);
          setScannedFeedback('');
          
          // Auto focus the price field
          setTimeout(() => {
            const priceInput = document.getElementById('new-product-price');
            if (priceInput) priceInput.focus();
          }, 100);
        }, 650);
      }, 900);
    }, 600);
  };

  const activeOrdersCount = orders.filter((o) => o.status !== 'Delivered').length;
  const totalRevenue = orders.reduce((acc, curr) => acc + curr.total, 0) + 12480;

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
    <div className="min-h-screen bg-zinc-950 flex font-sans text-zinc-300">
      {/* Sidebar - Integrated & Highly Reactive */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 hidden md:flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800/80 bg-zinc-950/30">
          <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-zinc-100 tracking-tight block text-sm leading-tight truncate w-40">{storeName}</span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-0.5">Merchant Portal</span>
          </div>
        </div>
        
        <div className="px-4 py-6 flex-1">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-left ${
                activeTab === 'analytics' 
                  ? 'bg-zinc-850 text-white border-l-2 border-orange-500 pl-2.5 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-250 hover:bg-zinc-850/40'
              }`}
            >
              <LayoutDashboard size={18} className={activeTab === 'analytics' ? 'text-orange-500' : 'text-zinc-500'} />
              <span>Overview & Charts</span>
            </button>

            <button 
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-left ${
                activeTab === 'orders' 
                  ? 'bg-zinc-850 text-white border-l-2 border-orange-500 pl-2.5 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-250 hover:bg-zinc-850/40'
              }`}
            >
              <ShoppingCart size={18} className={activeTab === 'orders' ? 'text-orange-500' : 'text-zinc-500'} />
              <span>Live Orders Queue ({activeOrdersCount})</span>
            </button>

            <button 
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-left ${
                activeTab === 'inventory' 
                  ? 'bg-zinc-850 text-white border-l-2 border-orange-500 pl-2.5 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-250 hover:bg-zinc-850/40'
              }`}
            >
              <Package size={18} className={activeTab === 'inventory' ? 'text-orange-500' : 'text-zinc-500'} />
              <span>Inventory Catalog ({inventory.length})</span>
            </button>

            <button 
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-left ${
                activeTab === 'customers' 
                  ? 'bg-zinc-850 text-white border-l-2 border-orange-500 pl-2.5 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-250 hover:bg-zinc-850/40'
              }`}
            >
              <Users size={18} className={activeTab === 'customers' ? 'text-orange-500' : 'text-zinc-500'} />
              <span>Customer Reach</span>
            </button>
          </nav>
        </div>
        
        <div className="px-4 py-6 border-t border-zinc-800/80">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-left ${
                activeTab === 'settings' 
                  ? 'bg-zinc-850 text-white border-l-2 border-orange-500 pl-2.5 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-250 hover:bg-zinc-850/40'
              }`}
            >
              <Settings size={18} className={activeTab === 'settings' ? 'text-orange-500' : 'text-zinc-500'} />
              <span>Store Settings</span>
            </button>

            <Link 
              href="/" 
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-850/40 transition-colors"
            >
              <LogOut size={18} className="text-zinc-500" />
              <span>Return to App</span>
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile Header / Quick Tab Selector */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-500" />
            <span className="font-extrabold text-zinc-100 text-sm truncate max-w-[150px]">{storeName}</span>
          </div>
          <div className="flex gap-2">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-bold focus:outline-none focus:border-orange-500"
            >
              <option value="analytics">Overview</option>
              <option value="orders">Orders</option>
              <option value="inventory">Inventory</option>
              <option value="customers">Customers</option>
              <option value="settings">Settings</option>
            </select>
            <Link href="/" className="text-xs font-bold text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-850">
              Exit
            </Link>
          </div>
        </header>

        {/* Outer Dashboard Page */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black text-zinc-100 tracking-tight">
                {activeTab === 'analytics' && 'Overview & Analytics'}
                {activeTab === 'orders' && 'Order Management'}
                {activeTab === 'inventory' && 'Products & Inventory'}
                {activeTab === 'customers' && 'Customer Reach'}
                {activeTab === 'settings' && 'Store Settings'}
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-semibold">
                Manage your store's operations, modify prices, and monitor active preparation orders.
              </p>
            </div>
            
            {/* Quick Utility Buttons */}
            <div className="flex gap-3 shrink-0">
              <button 
                onClick={handleExportData}
                className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-xs font-bold rounded-xl text-zinc-300 transition border border-zinc-800 cursor-pointer"
              >
                Export Report
              </button>
              {(activeTab === 'inventory' || activeTab === 'analytics') && (
                <>
                  <button 
                    onClick={() => {
                      setIsAddProductOpen(true);
                      setTimeout(() => {
                        setIsScanning(true);
                      }, 120);
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-xs font-bold rounded-xl text-orange-500 transition border border-zinc-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📷</span>
                    <span>Scan to List</span>
                  </button>
                  <button 
                    onClick={() => setIsAddProductOpen(true)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-xs font-bold rounded-xl text-white transition shadow-md shadow-orange-500/10 active:scale-[0.98] cursor-pointer"
                  >
                    + Add Product
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Content: Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Gross Sales" value={`₹${totalRevenue.toLocaleString()}`} icon={<DollarSign size={20} />} trend="↑ 18.4%" trendColor="text-emerald-500" />
                <MetricCard title="Active Queue" value={`${activeOrdersCount} Orders`} icon={<ShoppingBag size={20} />} />
                <MetricCard title="Customer Reach" value="312 Buyers" icon={<Users size={20} />} />
                <MetricCard title="Store Rating" value="4.8 Stars" icon={<Star size={20} className="fill-current text-amber-500 animate-pulse" />} />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-zinc-150 text-sm mb-6 uppercase tracking-wider">Sales Velocity & Activity (7 Days)</h3>
                <div className="h-64 w-full flex items-end justify-between gap-3 pt-6 border-b border-zinc-850 px-2">
                  {[45, 65, 50, 85, 55, 95, 75].map((h, i) => (
                    <div key={i} className="w-full bg-zinc-850 rounded-t-lg relative group hover:bg-orange-500/10 border border-zinc-800 hover:border-orange-500/20 transition-all" style={{ height: `${h}%` }}>
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-zinc-950 border border-zinc-800 text-[10px] font-mono font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 shadow-xl">
                        ₹{h * 120}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 mt-4 font-bold uppercase tracking-wider px-2">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Orders Queue */}
          {activeTab === 'orders' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
                <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">Live Orders Queue</h3>
                {isUpdating && <Clock className="w-4 h-4 text-orange-500 animate-spin" />}
              </div>
              <div className="divide-y divide-zinc-800">
                {orders.length === 0 ? (
                  <p className="p-12 text-center text-xs text-zinc-550 font-bold uppercase">No active orders in queue</p>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-900/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-zinc-100">{ord.id}</span>
                          <span className="text-[9px] bg-zinc-850 border border-zinc-700 px-2 py-0.5 rounded-full font-extrabold uppercase text-zinc-400">{ord.status}</span>
                          <span className="text-[10px] text-zinc-500 font-medium">{ord.timestamp}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-200">Buyer: {ord.customerName}</p>
                        <p className="text-xs text-zinc-450 leading-relaxed font-medium">{ord.items}</p>
                      </div>
                      
                      <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-850">
                        <span className="text-sm font-extrabold text-zinc-100">₹{ord.total.toFixed(2)}</span>
                        <div className="flex gap-2 w-32 justify-end">
                          {ord.status === 'Received' && (
                            <button onClick={() => handleUpdateOrderStatus(ord.id, 'Preparing')} className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-[10px] rounded-lg shadow-sm w-full cursor-pointer transition">
                              Prepare
                            </button>
                          )}
                          {ord.status === 'Preparing' && (
                            <button onClick={() => handleUpdateOrderStatus(ord.id, 'Dispatched')} className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-750 font-bold text-[10px] rounded-lg w-full cursor-pointer transition">
                              Dispatch
                            </button>
                          )}
                          {ord.status === 'Dispatched' && (
                            <button onClick={() => handleUpdateOrderStatus(ord.id, 'Delivered')} className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg shadow-sm w-full cursor-pointer transition">
                              Deliver
                            </button>
                          )}
                          {ord.status === 'Delivered' && (
                            <span className="flex items-center justify-end w-full gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                              Delivered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Inventory Catalog */}
          {activeTab === 'inventory' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-800 bg-zinc-950/20 flex justify-between items-center">
                <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">Store Product Catalog</h3>
                <span className="text-[10px] font-mono font-bold text-zinc-500">{inventory.length} active items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-400">
                  <thead className="text-[10px] text-zinc-500 uppercase bg-zinc-950/40 border-b border-zinc-800 font-extrabold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Product Info</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">In-Store Stock</th>
                      <th className="px-6 py-4 text-right">Price (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {inventory.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <img src={inv.image} className="w-10 h-10 rounded-lg border border-zinc-800 object-cover shrink-0" alt="" />
                          <span className="font-bold text-zinc-100">{inv.name}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-zinc-450">{inv.category}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 bg-zinc-950/40 border border-zinc-850 w-fit rounded-lg p-0.5">
                            <button 
                              onClick={() => handleUpdateStock(inv.id, -1)} 
                              className="p-1 hover:bg-zinc-800 hover:text-white rounded transition cursor-pointer"
                            >
                              <Minus className="w-3 h-3 text-zinc-500" />
                            </button>
                            <span className="w-8 text-center font-mono font-extrabold text-zinc-100">{inv.stockCount}</span>
                            <button 
                              onClick={() => handleUpdateStock(inv.id, 1)} 
                              className="p-1 hover:bg-zinc-800 hover:text-white rounded transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-zinc-500" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-zinc-500 font-bold">₹</span>
                            <input
                              type="number"
                              value={inv.price}
                              onChange={(e) => handleUpdatePrice(inv.id, parseFloat(e.target.value) || 0)}
                              className="w-16 bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1 text-right text-zinc-100 font-mono font-extrabold focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content: Store Settings */}
          {activeTab === 'settings' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden p-6 max-w-2xl">
              <div className="border-b border-zinc-800 pb-4 mb-6">
                <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">Business Profile Settings</h3>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Edit store operational details, hours, and phone indicators.</p>
              </div>

              {saveSuccessMsg && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-5">
                
                {/* Store Availability Status Trigger */}
                <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-zinc-150">Accepting Orders</h4>
                    <p className="text-[9px] text-zinc-500 font-medium">Turn off to temporarily close Sri Krishna Dairy Provisions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStoreIsOpenStatus(!storeIsOpenStatus)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      storeIsOpenStatus ? 'bg-orange-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        storeIsOpenStatus ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Official Store Name</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Store Username / Handle</label>
                    <input
                      type="text"
                      required
                      value={storeHandle}
                      onChange={(e) => setStoreHandle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Business Category</label>
                    <input
                      type="text"
                      required
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Store Description</label>
                  <textarea
                    rows={3}
                    required
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Profile Photo URL</label>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-[9px] font-black uppercase text-orange-500 hover:text-orange-400 tracking-wider transition-colors cursor-pointer bg-zinc-950/40 border border-zinc-850 px-2 py-0.5 rounded"
                      >
                        Upload Photo
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Paste image URL here..."
                      value={storeLogo.startsWith('data:') ? '' : storeLogo}
                      onChange={(e) => setStoreLogo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Banner Image / CSS</label>
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        className="text-[9px] font-black uppercase text-orange-500 hover:text-orange-400 tracking-wider transition-colors cursor-pointer bg-zinc-950/40 border border-zinc-850 px-2 py-0.5 rounded"
                      >
                        Upload Banner
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Paste image URL or linear-gradient CSS here..."
                      value={storeBannerImage.startsWith('data:') ? '' : storeBannerImage}
                      onChange={(e) => setStoreBannerImage(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={bannerInputRef}
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Business Address Location</label>
                  <input
                    type="text"
                    required
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Pickup Location</label>
                  <input
                    type="text"
                    required
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Support Phone Number</label>
                    <input
                      type="text"
                      required
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Category Tags (Comma separated)</label>
                    <input
                      type="text"
                      required
                      value={storeTags}
                      onChange={(e) => setStoreTags(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">UPI Details</label>
                    <input
                      type="text"
                      required
                      value={upiDetails}
                      onChange={(e) => setUpiDetails(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Bank Details</label>
                    <input
                      type="text"
                      required
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">GST Number (Optional)</label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Social Links (Optional)</label>
                    <input
                      type="text"
                      value={socialLinks}
                      onChange={(e) => setSocialLinks(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Opening Time</label>
                    <input
                      type="text"
                      required
                      placeholder="06:00 AM"
                      value={storeOpenTime}
                      onChange={(e) => setStoreOpenTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Closing Time</label>
                    <input
                      type="text"
                      required
                      placeholder="09:30 PM"
                      value={storeCloseTime}
                      onChange={(e) => setStoreCloseTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-850 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/10 transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingSettings ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Saving Updates...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab Content: Customer Reach */}
          {activeTab === 'customers' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Followers" value="1,284" icon={<Users size={20} />} trend="+42 this week" trendColor="text-emerald-500" />
              <MetricCard title="Store Rating" value="4.8 / 5" icon={<Star size={20} />} trend="89 reviews" trendColor="text-amber-500" />
              <MetricCard title="Repeat Buyers" value="38%" icon={<TrendingUp size={20} />} trend="+6.2%" trendColor="text-emerald-500" />
              <div className="md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wider mb-4">Recent Customer Signals</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {['Priya followed your store after ordering milk', 'Aarav rated delivery packaging 5 stars', 'Meera asked about weekend pickup hours'].map((item) => (
                    <div key={item} className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 text-zinc-300 font-semibold">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Product Modal Overlay */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col border-zinc-750">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 text-white">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🏪</span>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-white">Add New Product</h3>
                  <p className="text-[10px] text-zinc-550 font-medium">Sri Krishna Dairy Provisions Catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddProductOpen(false);
                  setNewProdName('');
                  setNewProdPrice('');
                  setNewProdStock('');
                  setNewProdImage('');
                }}
                className="text-zinc-500 hover:text-white font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddNewProduct} className="p-6 space-y-4">
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Product Name</label>
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="flex items-center gap-1 text-[9px] font-black uppercase text-orange-500 hover:text-orange-400 tracking-wider bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                  >
                    <span>📷</span>
                    <span>Scan Barcode</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Raw Butter (250g)"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Category</label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-semibold focus:text-zinc-100"
                >
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Fresh Produce">Fresh Produce</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Pharmacy">Pharmacy</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Price (INR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    id="new-product-price"
                    placeholder="120"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-mono font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Initial Stock</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="25"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-all font-mono font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Product Photo</label>
                  {newProdImage && (
                    <button
                      type="button"
                      onClick={() => setNewProdImage('')}
                      className="text-[9px] font-extrabold uppercase text-rose-500 hover:text-rose-400 tracking-wider transition-colors cursor-pointer bg-transparent border-none"
                    >
                      Clear Image
                    </button>
                  )}
                </div>
                
                {/* Hidden File Input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {newProdImage ? (
                  /* Image Preview Mode */
                  <div className="relative aspect-video w-full rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden group">
                    <img
                      src={newProdImage}
                      alt="Product Preview"
                      className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-[10px] font-extrabold text-white rounded-lg transition-all cursor-pointer shadow-lg"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewProdImage('')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-[10px] font-extrabold text-white rounded-lg transition-all cursor-pointer shadow-lg"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  /* File Upload Drop Area */
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="w-full aspect-[3/1.2] border border-dashed border-zinc-800 hover:border-orange-500/50 bg-zinc-950/40 hover:bg-zinc-950/80 rounded-2xl flex flex-col items-center justify-center p-4 transition-all duration-300 group cursor-pointer"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform duration-300">📷</span>
                    <span className="text-xs font-black text-zinc-300 mt-2 block">Upload Local Image</span>
                    <span className="text-[9px] text-zinc-550 mt-1 block font-medium">PNG, JPG, or WEBP up to 5MB</span>
                  </button>
                )}

                {/* Direct URL Fallback */}
                <div className="mt-1">
                  <input
                    type="text"
                    placeholder="Or paste image URL instead..."
                    value={newProdImage.startsWith('data:') ? '' : newProdImage}
                    onChange={(e) => setNewProdImage(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] text-zinc-400 placeholder-zinc-650 focus:outline-none focus:border-orange-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddProductOpen(false);
                    setNewProdName('');
                    setNewProdPrice('');
                    setNewProdStock('');
                    setNewProdImage('');
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/10 transition cursor-pointer text-center"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Webcam Camera Barcode Scanner Viewport Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <style>{`
            @keyframes laserMove {
              0%, 100% { top: 10%; }
              50% { top: 90%; }
            }
            .animate-laser {
              animation: laserMove 2s infinite ease-in-out;
              position: absolute;
            }
            .bg-scanlines {
              background: linear-gradient(
                rgba(18, 16, 16, 0) 50%, 
                rgba(0, 0, 0, 0.25) 50%
              ), linear-gradient(
                90deg, 
                rgba(255, 0, 0, 0.06), 
                rgba(0, 255, 0, 0.02), 
                rgba(0, 0, 255, 0.06)
              );
              background-size: 100% 4px, 3px 100%;
            }
          `}</style>
          
          <div className="w-full max-w-lg bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden backdrop-saturate-150">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* Cyber Header */}
            <div className="w-full flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest font-mono">EAN-13 SCANNING ENGINE v2.4</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsScanning(false);
                  setScannedFeedback('');
                }}
                className="text-zinc-400 hover:text-white font-bold text-xs bg-zinc-950 hover:bg-zinc-850 px-3 py-1.5 rounded-xl border border-zinc-800 cursor-pointer transition-all"
              >
                Abort
              </button>
            </div>

            {/* Real Viewfinder Video Stream Window */}
            <div className="w-full max-w-sm aspect-[4/3] rounded-2xl border border-zinc-800 bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center shadow-inner group">
              <div id="barcode-scanner-viewport" className="w-full h-full object-cover"></div>
              
              {/* Framing Corner Brackets Overlay */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-orange-500 rounded-tl-md pointer-events-none" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-orange-500 rounded-tr-md pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-orange-500 rounded-bl-md pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-orange-500 rounded-br-md pointer-events-none" />

              {/* Pulsing Red Laser Line Overlay */}
              <div className="absolute left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.7)] animate-laser pointer-events-none" />
            </div>

            {/* Quick Status / Feedback Bar */}
            <div className="w-full mt-6 p-3.5 bg-zinc-950/60 border border-zinc-850 rounded-2xl text-center">
              <span className="text-[10px] font-mono font-extrabold uppercase text-orange-500 animate-pulse tracking-wider block">
                {scannedFeedback || 'ALIGN BARCODE / QR CODE WITHIN VIEWPORT'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, trend, trendColor }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-400 border border-zinc-800">
          {icon}
        </div>
        {trend && <span className={`text-xs font-bold ${trendColor}`}>{trend}</span>}
      </div>
      <div>
        <h4 className="text-xs font-bold text-zinc-550 uppercase tracking-wider mb-1">{title}</h4>
        <p className="text-2xl font-black text-zinc-100 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
