'use client';

import React from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { buildGoogleEmbedUrl, buildGoogleDirectionsUrl } from '@/lib/mapUrls';

interface StoreLocationMapProps {
  storeName: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  /** Shows a loading state instead of the map (e.g. while fetching the store). */
  loading?: boolean;
  zoom?: number;
  /** Tailwind height class for the map area. */
  heightClass?: string;
  className?: string;
}

/**
 * Renders a real Google map centered on a single store's exact coordinates,
 * with the store name, address and a "Get Directions" deep link.
 *
 * Uses Google Maps' keyless `output=embed` iframe so it works without a
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY being configured.
 */
export default function StoreLocationMap({
  storeName,
  address,
  latitude,
  longitude,
  loading = false,
  zoom = 16,
  heightClass = 'h-56',
  className = '',
}: StoreLocationMapProps) {
  const hasCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <div className={`glass-card rounded-3xl p-5 space-y-4 border-zinc-900 ${className}`}>
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-orange-500" />
        Pickup Location
      </h3>

      <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950 shadow-inner`}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Locating store…</p>
          </div>
        ) : hasCoords ? (
          <iframe
            title={`Map showing the exact location of ${storeName}`}
            src={buildGoogleEmbedUrl({ latitude: latitude as number, longitude: longitude as number }, zoom)}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <MapPin className="w-6 h-6 text-zinc-600" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Exact location unavailable for this store
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-black text-white truncate">{storeName}</p>
        {address && (
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">{address}</p>
        )}
        {hasCoords && (
          <p className="text-[10px] text-zinc-550 font-medium">
            ({(latitude as number).toFixed(4)}, {(longitude as number).toFixed(4)})
          </p>
        )}
      </div>

      {hasCoords && (
        <a
          href={buildGoogleDirectionsUrl({ latitude: latitude as number, longitude: longitude as number })}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Navigation className="w-4 h-4 shrink-0 text-zinc-950" />
          Get Directions
        </a>
      )}
    </div>
  );
}
