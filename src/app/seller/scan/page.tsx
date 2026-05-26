'use client';

import React, { useCallback, useRef, useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import ProductPreview from '@/components/ProductPreview';
import ManualProductForm from '@/components/ManualProductForm';
import { toast } from '@/lib/toast';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';

interface ScannedProduct {
  barcode: string;
  name: string;
  image: string;
  brand: string;
  category: string;
  description: string;
  packaging: string;
  price?: number | string;
  stock?: number | string;
  discount?: number | string | null;
  existing?: boolean;
}

const ScanPage = () => {
  const [productData, setProductData] = useState<ScannedProduct | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState('');
  const cacheRef = useRef<Map<string, ScannedProduct>>(new Map());
  const lookupInFlightRef = useRef<string | null>(null);

  const handleDetected = useCallback(async (code: string) => {
    const barcode = code.trim();
    if (!barcode || lookupInFlightRef.current === barcode) return;

    // Check local cache first
    if (cacheRef.current.has(barcode)) {
      const cachedProduct = cacheRef.current.get(barcode);
      if (cachedProduct) {
        setProductData(cachedProduct);
      }
      setShowManual(false);
      return;
    }

    lookupInFlightRef.current = barcode;
    try {
      const res = await fetch(`/api/products/scan/${encodeURIComponent(barcode)}`);
      if (!res.ok) {
        setPendingBarcode(barcode);
        setProductData(null);
        setShowManual(true);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Barcode lookup returned a non-JSON response');
      }
      const data = await res.json() as { product: ScannedProduct };
      if (!data.product) {
        throw new Error('Barcode lookup response did not include a product');
      }
      const product = { ...data.product, barcode };
      // Store in cache for future scans
      cacheRef.current.set(barcode, product);
      setProductData(product);
      setPendingBarcode('');
      setShowManual(false);
    } catch (e) {
      console.error(e);
      toast('Lookup error');
      setPendingBarcode(barcode);
      setShowManual(true);
    } finally {
      lookupInFlightRef.current = null;
    }
  }, []);

  useHardwareScanner(handleDetected);

  const handleCancel = () => {
    setProductData(null);
    setShowManual(false);
    setPendingBarcode('');
  };

  const handleManualCreated = (product: ScannedProduct) => {
    if (product?.barcode) {
      cacheRef.current.set(product.barcode, product);
    }
    setProductData(product);
    setShowManual(false);
    setPendingBarcode('');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Scan Product</h1>
      {!productData && !showManual && (
        <BarcodeScanner onDetected={handleDetected} className="h-96" />
      )}
      {productData && (
        <ProductPreview key={productData.barcode} data={productData} onCancel={handleCancel} onSaved={handleManualCreated} />
      )}
      {showManual && (
        <ManualProductForm key={pendingBarcode} initialBarcode={pendingBarcode} onCancel={handleCancel} onCreated={handleManualCreated} />
      )}
    </div>
  );
};

export default ScanPage;
