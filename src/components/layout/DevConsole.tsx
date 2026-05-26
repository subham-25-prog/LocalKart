'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Database, Wifi, WifiOff, CheckCircle, AlertTriangle, RefreshCw, X, Play, ShieldAlert, Cpu } from 'lucide-react';

export default function DevConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [dbMode, setDbMode] = useState<'mock' | 'postgres'>('mock');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    isPrismaConfigured: boolean;
    dbReachable: boolean;
    connectionError: string | null;
    databaseUrl: string;
    stats: {
      storesCount: number;
      productsCount: number;
      storeProductsCount: number;
      reviewsCount: number;
    };
  } | null>(null);

  // Load initial settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('localkart_db_override') as 'mock' | 'postgres';
      if (savedMode) {
        setDbMode(savedMode);
        document.cookie = `localkart_db_mode=${savedMode}; path=/; max-age=31536000`;
      } else {
        localStorage.setItem('localkart_db_override', 'mock');
        document.cookie = 'localkart_db_mode=mock; path=/; max-age=31536000';
      }
      checkDbStatus();
    }
  }, []);

  const checkDbStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/db-status');
      const data = await res.json();
      if (data.success) {
        setDbStatus(data);
      }
    } catch (e) {
      console.error('Failed to query DB status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: 'mock' | 'postgres') => {
    setDbMode(mode);
    localStorage.setItem('localkart_db_override', mode);
    document.cookie = `localkart_db_mode=${mode}; path=/; max-age=31536000`;
    
    // Dispatch a global event so that sibling fetches know about mode changes
    window.dispatchEvent(new CustomEvent('localkart_db_mode_changed', { detail: mode }));

    // Soft page reload to trigger fresh dynamic data fetching under new mode
    window.location.reload();
  };

  return (
    <>
      {/* Floating Developer Console Toggle Badge */}
      <div className="fixed bottom-4 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider shadow-lg backdrop-blur-md cursor-pointer group"
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              dbMode === 'postgres' && dbStatus?.dbReachable ? 'bg-emerald-400' : 'bg-orange-500'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              dbMode === 'postgres' && dbStatus?.dbReachable ? 'bg-emerald-500' : 'bg-orange-500'
            }`} />
          </span>
          <Sliders className="w-3.5 h-3.5 text-zinc-400 group-hover:rotate-45 transition-transform" />
          <span>Dev Console</span>
        </motion.button>
      </div>

      {/* Developer Control Slide-over Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50"
            />

            {/* Sidebar panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-zinc-950/95 backdrop-blur-lg border-l border-zinc-900/60 shadow-2xl z-50 flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-850">
                    <Sliders className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-50 uppercase tracking-wider">Telemetry Console</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5 tracking-normal">LocalKart Dev Environment</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Console Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-6">
                
                {/* Database Engine Toggler */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-orange-500" />
                      Runtime Database Engine
                    </h4>
                    <span className="text-[8px] bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-zinc-400 font-black uppercase">
                      Sticky State
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-900 shadow-inner">
                    <button
                      onClick={() => handleModeChange('mock')}
                      className={`py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
                        dbMode === 'mock'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                      }`}
                    >
                      In-Memory Mock
                    </button>
                    <button
                      onClick={() => handleModeChange('postgres')}
                      className={`py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
                        dbMode === 'postgres'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                      }`}
                    >
                      PostgreSQL DB
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-500 leading-normal font-semibold">
                    {dbMode === 'mock' 
                      ? 'Currently running on standard robust JSON mock collections. Faster, zero setups, works perfectly offline!'
                      : 'Connecting directly to local PostgreSQL instance. Google place details will cache to table storage dynamically on discover.'}
                  </p>
                </div>

                {/* DB Health Status Indicator Card */}
                <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4.5 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Postgres Connectivity</span>
                    <button 
                      onClick={checkDbStatus}
                      disabled={loading}
                      className="p-1 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
                    </button>
                  </div>

                  {dbStatus ? (
                    <div className="space-y-3">
                      {/* Reachability Alert */}
                      {dbStatus.dbReachable ? (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold">
                          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                          <span>Connected to PostgreSQL Server</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                          <div className="flex items-center gap-2 font-bold">
                            <WifiOff className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>Database Server Unreachable</span>
                          </div>
                          {dbStatus.connectionError && (
                            <div className="p-2 bg-zinc-950 border border-zinc-900/50 rounded-lg text-[9px] text-zinc-450 font-mono overflow-x-auto select-all max-h-16 scrollbar-none leading-relaxed">
                              {dbStatus.connectionError}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Connection details */}
                      <div className="space-y-1.5 text-[10px] font-semibold text-zinc-450 pt-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-550">Target Host:</span>
                          <span className="font-mono text-zinc-350">{dbStatus.databaseUrl}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-550">Prisma Client Status:</span>
                          <span className="text-zinc-350">{dbStatus.isPrismaConfigured ? 'Prisma Configured' : 'No Connection URL'}</span>
                        </div>
                      </div>

                      {/* DB stats (only if reachable) */}
                      {dbStatus.dbReachable && (
                        <div className="pt-3 border-t border-zinc-900 space-y-2">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Live Postgres Statistics</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl text-center shadow-inner">
                              <span className="block text-[8px] font-bold text-zinc-500 uppercase">Stores</span>
                              <span className="text-sm font-extrabold text-orange-500">{dbStatus.stats.storesCount}</span>
                            </div>
                            <div className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl text-center shadow-inner">
                              <span className="block text-[8px] font-bold text-zinc-500 uppercase">Products</span>
                              <span className="text-sm font-extrabold text-orange-500">{dbStatus.stats.productsCount}</span>
                            </div>
                            <div className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl text-center shadow-inner">
                              <span className="block text-[8px] font-bold text-zinc-500 uppercase">Mappings</span>
                              <span className="text-sm font-extrabold text-orange-500">{dbStatus.stats.storeProductsCount}</span>
                            </div>
                            <div className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl text-center shadow-inner">
                              <span className="block text-[8px] font-bold text-zinc-500 uppercase">Reviews</span>
                              <span className="text-sm font-extrabold text-orange-500">{dbStatus.stats.reviewsCount}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-zinc-500 py-2">
                      Querying local telemetry variables...
                    </div>
                  )}
                </div>

                {/* Dev Actions Quick Utilities */}
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-orange-500" />
                    Quick Telemetry Actions
                  </h4>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        localStorage.clear();
                        document.cookie = 'localkart_db_mode=mock; path=/; max-age=0';
                        alert('LocalKart cached local storage and cookies cleared successfully. State reloaded!');
                        window.location.reload();
                      }}
                      className="w-full text-left py-2 px-3 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-xl text-xs font-bold text-zinc-350 hover:text-white transition flex items-center justify-between cursor-pointer"
                    >
                      <span>Clear Storage Cache</span>
                      <span className="text-[8px] uppercase px-1.5 py-0.5 bg-zinc-900 rounded text-zinc-500 border border-zinc-850">LocalStorage</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const telemetryText = `DB MODE: ${dbMode}\nREACHABLE: ${dbStatus?.dbReachable ? 'YES' : 'NO'}\nHOST: ${dbStatus?.databaseUrl}\nERR: ${dbStatus?.connectionError || 'NONE'}`;
                        navigator.clipboard.writeText(telemetryText);
                        alert('Telemetry variables copied to clipboard successfully!');
                      }}
                      className="w-full text-left py-2 px-3 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-xl text-xs font-bold text-zinc-350 hover:text-white transition flex items-center justify-between cursor-pointer"
                    >
                      <span>Copy Telemetry Diagnostics</span>
                      <span className="text-[8px] uppercase px-1.5 py-0.5 bg-zinc-900 rounded text-zinc-500 border border-zinc-850">Telemetry Logs</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-900 bg-zinc-950 text-center flex flex-col items-center gap-1 justify-center">
                <span className="text-[9px] text-zinc-650 font-black uppercase tracking-widest flex items-center gap-1.5 justify-center leading-none">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  LocalKart System Bridge
                </span>
                <span className="text-[7.5px] text-zinc-500 font-bold tracking-tight">Active Engine Mode: {dbMode.toUpperCase()}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
