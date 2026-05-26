'use client';
import React from 'react';

type Tab = 'analytics' | 'orders' | 'inventory' | 'settings';

interface Props {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export default function DashboardTabs({ activeTab, setActiveTab }: Props) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'orders', label: 'Orders' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === t.id
              ? 'bg-orange-500 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
