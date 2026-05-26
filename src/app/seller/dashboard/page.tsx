// src/app/seller/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import DashboardTabs from '@/components/seller/DashboardTabs';
import AnalyticsSection from '@/components/seller/AnalyticsSection';
import OrdersSection from '@/components/seller/OrdersSection';
import InventorySection from '@/components/seller/InventorySection';
import SettingsSection from '@/components/seller/SettingsSection';

export default function SellerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'inventory' | 'settings'>('analytics');

  // Guard: only sellers can access
  useEffect(() => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('localkart_user') || 'null') : null;
    if (!user || user.role !== 'seller') {
      toast('You must be logged in as a seller');
      router.replace('/login?role=seller&callbackUrl=/seller/dashboard');
    }
  }, [router]);

  const renderTab = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsSection />;
      case 'orders':
        return <OrdersSection />;
      case 'inventory':
        return <InventorySection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-4">
      <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-6 animate-fade-in">{renderTab()}</div>
    </div>
  );
}
