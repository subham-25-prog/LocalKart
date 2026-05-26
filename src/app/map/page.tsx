'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Map, 
  Store, 
  Navigation, 
  ArrowLeft, 
  Star, 
  Clock, 
  CheckCircle, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Battery, 
  User, 
  Phone, 
  Sliders,
  Loader2
} from 'lucide-react';
import { calculateDistance } from '@/lib/geo';

interface MapVendor {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  rating: number;
  logo: string;
  openTime: string;
  closeTime: string;
  verified: boolean;
  distance: string;
  category: 'grocery' | 'dairy' | 'pharmacy' | 'electronics';
  stockCount: number;
  isOpen: boolean;
  address: string;
}

interface MapRider {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  battery: number;
  vehicle: string;
  eta: string;
  deliveringTo: string;
  destLatitude: number;
  destLongitude: number;
}

const GOOGLE_MAPS_DARK_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#18181b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#09090b" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#a1a1aa" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#e4e4e7" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#a1a1aa" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#121214" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#71717a" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#27272a" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#18181b" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#71717a" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3f3f46" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#27272a" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#e4e4e7" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#18181b" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#a1a1aa" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#09090b" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#52525b" }] },
  // Explicitly ensure all business POIs are fully visible and accented in LocalKart branding color
  { "featureType": "poi.business", "elementType": "all", "stylers": [{ "visibility": "on" }] },
  { "featureType": "poi.business", "elementType": "labels.text.fill", "stylers": [{ "color": "#f97316" }] },
  { "featureType": "poi.business", "elementType": "labels.icon", "stylers": [{ "color": "#f97316" }] }
];

export default function HyperlocalMapInterface() {
  const router = useRouter();
  
  // Interactive UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<MapVendor | null>(null);
  const [selectedRider, setSelectedRider] = useState<MapRider | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLoc, setUserLoc] = useState({ lat: 12.9716, lng: 77.6400, name: 'Indiranagar Central' });
  const [nearbyStores, setNearbyStores] = useState<MapVendor[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  const mapRef = useRef<any>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const leafletMarkerGroupRef = useRef<any>(null);
  const googleOverlaysRef = useRef<any[]>([]);

  // Detect map engine choice based on API Key presence in Environment
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapEngine = apiKey ? 'google' : 'leaflet';

  // Load coordinates and location
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocation = localStorage.getItem('localkart_location');
      if (savedLocation) {
        try {
          setUserLoc(JSON.parse(savedLocation));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Fetch Nearby Listings
  const loadNearbyListings = async (lat: number, lng: number) => {
    setIsLoadingListings(true);

    const loadSimulatedListings = () => {
      const mockStoreTemplates = [
        { name: "Fresh Mart Supermarket", type: "Grocery Store", logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100", rating: 4.6, openTime: "07:30 AM", closeTime: "10:30 PM", verified: true, category: 'grocery', stockCount: 140 },
        { name: "Sri Krishna Dairy & Provisions", type: "Dairy & Grocery", logo: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=100", rating: 4.8, openTime: "06:00 AM", closeTime: "09:30 PM", verified: true, category: 'dairy', stockCount: 88 },
        { name: "Super Save Hypermarket", type: "Supermarket", logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100", rating: 4.2, openTime: "08:00 AM", closeTime: "11:00 PM", verified: true, category: 'grocery', stockCount: 220 },
        { name: "Quick Meds Pharmacy", type: "Pharmacy & Wellness", logo: "https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=100", rating: 4.5, openTime: "07:00 AM", closeTime: "11:30 PM", verified: true, category: 'pharmacy', stockCount: 54 },
        { name: "Alpha Electronics", type: "Electronics Store", logo: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100", rating: 4.4, openTime: "10:00 AM", closeTime: "09:00 PM", verified: false, category: 'electronics', stockCount: 310 }
      ];

      const generated = mockStoreTemplates.map((item, idx) => {
        const offsetLat = (idx % 2 === 0 ? 1 : -1) * (0.003 + idx * 0.0012);
        const offsetLng = (idx % 3 === 0 ? 1 : -1) * (0.002 + idx * 0.0014);
        const storeLat = lat + offsetLat;
        const storeLng = lng + offsetLng;
        const dist = calculateDistance(lat, lng, storeLat, storeLng);

        return {
          id: `store-simulated-${idx}`,
          name: item.name,
          type: item.type,
          latitude: storeLat,
          longitude: storeLng,
          rating: item.rating,
          logo: item.logo,
          openTime: item.openTime,
          closeTime: item.closeTime,
          verified: item.verified,
          distance: `${dist.toFixed(1)} km`,
          category: item.category as any,
          stockCount: item.stockCount,
          isOpen: true,
          address: `${10 + idx * 5}, Cross Rd, near ${userLoc.name.split(',')[0]}`
        };
      });

      setNearbyStores(generated);
      setIsLoadingListings(false);
    };

    try {
      const savedMode = typeof window !== 'undefined' ? localStorage.getItem('localkart_db_override') || 'mock' : 'mock';
      const res = await fetch(`/api/stores?lat=${lat}&lng=${lng}&radius=2000&db_mode=${savedMode}`);
      const data = await res.json();
      if (data.success && data.stores) {
        const mapped = data.stores.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          latitude: s.latitude,
          longitude: s.longitude,
          rating: s.rating,
          logo: s.logo,
          openTime: s.openTime || '08:00 AM',
          closeTime: s.closeTime || '10:00 PM',
          verified: s.verified ?? true,
          distance: `${s.distance.toFixed(1)} km`,
          category: (s.category || 'grocery') as any,
          stockCount: s.products?.length || 100,
          isOpen: s.openNow ?? true,
          address: s.address
        }));
        setNearbyStores(mapped);
      } else {
        loadSimulatedListings();
      }
    } catch (e) {
      console.error("Backend map fetch failed, using simulation:", e);
      loadSimulatedListings();
    }
    setIsLoadingListings(false);
  };

  // Dynamically load engine scripts (Leaflet vs Google Maps JS)
  useEffect(() => {
    if (mapEngine === 'leaflet') {
      // 1. Append Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 2. Append Leaflet JS
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
          setMapLoaded(true);
          loadNearbyListings(userLoc.lat, userLoc.lng);
        };
        document.body.appendChild(script);
      } else {
        if ((window as any).L) {
          setMapLoaded(true);
          loadNearbyListings(userLoc.lat, userLoc.lng);
        } else {
          const interval = setInterval(() => {
            if ((window as any).L) {
              setMapLoaded(true);
              loadNearbyListings(userLoc.lat, userLoc.lng);
              clearInterval(interval);
            }
          }, 100);
        }
      }
    } else {
      // Load Google Maps JS SDK dynamically
      if (!(window as any).google || !(window as any).google.maps) {
        const script = document.createElement('script');
        script.id = 'google-maps-js';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
        script.async = true;
        script.onload = () => {
          setMapLoaded(true);
          loadNearbyListings(userLoc.lat, userLoc.lng);
        };
        document.body.appendChild(script);
      } else {
        setMapLoaded(true);
        loadNearbyListings(userLoc.lat, userLoc.lng);
      }
    }
  }, [mapEngine, userLoc.lat, userLoc.lng]);

  // Delivery riders mock markers with real GPS destinations
  const riders: MapRider[] = useMemo(() => [
    { id: 'rider-1', name: 'Rider Ramesh', latitude: userLoc.lat + 0.0016, longitude: userLoc.lng - 0.0010, battery: 84, vehicle: 'Ather 450X (Electric)', eta: '6 Mins', deliveringTo: 'Fresh Mart Supermarket', destLatitude: userLoc.lat + 0.0036, destLongitude: userLoc.lng + 0.0012 },
    { id: 'rider-2', name: 'Rider Sunil', latitude: userLoc.lat - 0.0001, longitude: userLoc.lng - 0.0010, battery: 92, vehicle: 'Ola S1 Pro (Electric)', eta: '4 Mins', deliveringTo: 'Sri Krishna Dairy & Provisions', destLatitude: userLoc.lat - 0.0014, destLongitude: userLoc.lng - 0.0032 }
  ], [userLoc]);

  // Live filter computation
  const filteredVendors = useMemo(() => {
    return nearbyStores.filter((vendor) => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || vendor.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || vendor.category === activeCategory;
      const matchesVerified = !onlyVerified || vendor.verified;
      return matchesSearch && matchesCategory && matchesVerified;
    });
  }, [nearbyStores, searchQuery, activeCategory, onlyVerified]);

  const handleSelectVendor = (vendor: MapVendor) => {
    setSelectedRider(null);
    setSelectedVendor(vendor);
    if (mapEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.panTo({ lat: vendor.latitude, lng: vendor.longitude });
      googleMapInstanceRef.current.setZoom(16);
    } else if (mapEngine === 'leaflet' && mapRef.current) {
      mapRef.current.setView([vendor.latitude, vendor.longitude], 16, { animate: true });
    }
  };

  const handleSelectRider = (rider: MapRider) => {
    setSelectedVendor(null);
    setSelectedRider(rider);
    if (mapEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.panTo({ lat: rider.latitude, lng: rider.longitude });
      googleMapInstanceRef.current.setZoom(16);
    } else if (mapEngine === 'leaflet' && mapRef.current) {
      mapRef.current.setView([rider.latitude, rider.longitude], 16, { animate: true });
    }
  };

  // Initialize Map Container
  useEffect(() => {
    if (!mapLoaded) return;

    if (mapEngine === 'leaflet') {
      const L = (window as any).L;
      if (!L) return;

      // Standard Leaflet bundle fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map('real-leaflet-map', {
        zoomControl: false,
        attributionControl: false
      }).setView([userLoc.lat, userLoc.lng], 15);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(map);

      mapRef.current = map;
    } else {
      // Initialize Google Map Dark Styled
      const google = (window as any).google;
      if (!google || !google.maps) return;

      const mapOptions = {
        center: { lat: userLoc.lat, lng: userLoc.lng },
        zoom: 15,
        styles: GOOGLE_MAPS_DARK_STYLE,
        disableDefaultUI: true,
        gestureHandling: 'greedy'
      };

      const gmap = new google.maps.Map(document.getElementById('real-leaflet-map'), mapOptions);
      googleMapInstanceRef.current = gmap;

      // Add click listener to detect native Google POIs clicked on map canvas
      gmap.addListener('click', async (event: any) => {
        if (event.placeId) {
          event.stop(); // Stop Google Maps default info popup
          const placeId = event.placeId;
          console.info("Google POI icon clicked. Dynamically importing into LocalKart:", placeId);
          
          setIsLoadingListings(true);
          try {
            const savedMode = typeof window !== 'undefined' ? localStorage.getItem('localkart_db_override') || 'mock' : 'mock';
            const res = await fetch(`/api/stores/${placeId}?lat=${userLoc.lat}&lng=${userLoc.lng}&db_mode=${savedMode}`);
            const data = await res.json();
            if (data.success && data.store) {
              const importedStore = {
                id: data.store.id,
                name: data.store.name,
                type: data.store.type,
                latitude: data.store.latitude,
                longitude: data.store.longitude,
                rating: data.store.rating,
                logo: data.store.logo,
                openTime: data.store.openTime || '08:00 AM',
                closeTime: data.store.closeTime || '10:00 PM',
                verified: data.store.verified ?? true,
                distance: `${data.distance.toFixed(1)} km`,
                category: (data.store.category || 'grocery') as any,
                stockCount: data.catalog?.length || 100,
                isOpen: data.store.isOpen ?? true,
                address: data.store.address
              };

              // Dynamic listing insertion
              setNearbyStores(prev => {
                if (prev.some(s => s.id === importedStore.id)) return prev;
                return [importedStore, ...prev];
              });

              // Select newly discovered store and pan to it
              setSelectedVendor(importedStore);
              gmap.panTo({ lat: importedStore.latitude, lng: importedStore.longitude });
              gmap.setZoom(16);
            }
          } catch (err) {
            console.error("Failed to import dynamic Google POI details:", err);
          }
          setIsLoadingListings(false);
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletMarkerGroupRef.current = null;
      googleMapInstanceRef.current = null;
    };
  }, [mapLoaded, mapEngine, userLoc.lat, userLoc.lng]);

  // Handle Markers Overlay Redraw
  useEffect(() => {
    if (!mapLoaded) return;

    if (mapEngine === 'leaflet') {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      if (!leafletMarkerGroupRef.current) {
        leafletMarkerGroupRef.current = L.layerGroup().addTo(mapRef.current);
      } else {
        leafletMarkerGroupRef.current.clearLayers();
      }

      const markerGroup = leafletMarkerGroupRef.current;

      // 1. Pulser Geolocation User marker
      const userPulseIcon = L.divIcon({
        className: '',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-5 h-5 bg-orange-500 rounded-full animate-ping opacity-40"></div>
            <div class="relative w-3.5 h-3.5 bg-orange-500 border-2 border-zinc-950 rounded-full shadow"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker([userLoc.lat, userLoc.lng], { icon: userPulseIcon })
        .addTo(markerGroup)
        .bindPopup(`<div class="text-xs font-bold text-zinc-955">You: ${userLoc.name}</div>`);

      // Concentric visual distance indicator zones around current GPS
      L.circle([userLoc.lat, userLoc.lng], {
        radius: 500,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.04,
        weight: 1.5,
        interactive: false
      }).addTo(markerGroup);

      L.circle([userLoc.lat, userLoc.lng], {
        radius: 1000,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.02,
        weight: 1.2,
        dashArray: '4, 4',
        interactive: false
      }).addTo(markerGroup);

      L.circle([userLoc.lat, userLoc.lng], {
        radius: 2000,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.01,
        weight: 1.0,
        dashArray: '6, 6',
        interactive: false
      }).addTo(markerGroup);

      // 2. Plot Stores
      filteredVendors.forEach((vendor) => {
        const isSelected = selectedVendor?.id === vendor.id;

        const storeIcon = L.divIcon({
          className: '',
          html: `
            <div class="relative flex flex-col items-center">
              <div class="w-9 h-9 rounded-full overflow-hidden border-2 shadow-lg transition-transform duration-200 ${
                isSelected 
                  ? 'border-orange-500 scale-110 ring-4 ring-orange-500/20' 
                  : 'border-zinc-700 hover:scale-105'
              } bg-zinc-900 flex items-center justify-center">
                <img src="${vendor.logo}" class="w-full h-full object-cover" />
              </div>
              ${vendor.verified ? `
                <div class="absolute -top-1 -right-1 bg-zinc-950 border border-zinc-850 rounded-full p-0.5 shadow">
                  <svg class="w-2.5 h-2.5 text-orange-500 fill-current" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l5-5z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              ` : ''}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });

        const marker = L.marker([vendor.latitude, vendor.longitude], { icon: storeIcon }).addTo(markerGroup);
        marker.on('click', () => {
          handleSelectVendor(vendor);
        });
      });

      // 3. Plot Riders & Polyline Routes
      riders.forEach((rider) => {
        const isSelected = selectedRider?.id === rider.id;

        const riderIcon = L.divIcon({
          className: '',
          html: `
            <div class="relative flex flex-col items-center">
              <div class="w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md transition-all ${
                isSelected 
                  ? 'bg-orange-500 border-zinc-950 text-white' 
                  : 'bg-emerald-500 border-zinc-950 text-zinc-955'
              }">
                <svg class="w-3.5 h-3.5 fill-current transform rotate-45" viewBox="0 0 24 24">
                  <path d="M12 2L2 22l10-4 10 4z" />
                </svg>
              </div>
              <span class="absolute -top-4 bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-300 px-1 py-0.5 rounded shadow whitespace-nowrap">
                ${rider.name.split(' ')[1] || rider.name}
              </span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([rider.latitude, rider.longitude], { icon: riderIcon }).addTo(markerGroup);
        marker.on('click', () => {
          handleSelectRider(rider);
        });

        if (selectedRider?.id === rider.id) {
          L.polyline(
            [[rider.latitude, rider.longitude], [rider.destLatitude, rider.destLongitude]],
            { color: '#f97316', weight: 3, dashArray: '6, 6', opacity: 0.85 }
          ).addTo(markerGroup);
        }
      });
    } else {
      // Plot HTML Overlays in Google Maps Engine
      const google = (window as any).google;
      if (!google || !google.maps || !googleMapInstanceRef.current) return;

      const map = googleMapInstanceRef.current;

      // Clear existing overlays
      googleOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      googleOverlaysRef.current = [];

      // Custom Overlay Class to render HTML/Tailwind styling dynamically inside Google Map
      class HTMLOverlay extends google.maps.OverlayView {
        private latlng: any;
        private html: string;
        private onClick: () => void;
        private div: HTMLDivElement | null = null;

        constructor(latlng: any, html: string, mapInstance: any, onClick: () => void) {
          super();
          this.latlng = latlng;
          this.html = html;
          this.onClick = onClick;
          this.setMap(mapInstance);
        }

        onAdd() {
          this.div = document.createElement('div');
          this.div.style.position = 'absolute';
          this.div.style.cursor = 'pointer';
          this.div.innerHTML = this.html;

          this.div.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onClick();
          });

          const panes = this.getPanes();
          panes.overlayMouseTarget.appendChild(this.div);
        }

        draw() {
          const projection = this.getProjection();
          if (!projection || !this.div) return;
          const pos = projection.fromLatLngToDivPixel(this.latlng);
          this.div.style.left = (pos.x - 18) + 'px';
          this.div.style.top = (pos.y - 36) + 'px';
        }

        onRemove() {
          if (this.div) {
            this.div.parentNode?.removeChild(this.div);
            this.div = null;
          }
        }
      }

      // Add overlays for User
      const userLatLng = new google.maps.LatLng(userLoc.lat, userLoc.lng);
      const userHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-5 h-5 bg-orange-500 rounded-full animate-ping opacity-40"></div>
          <div class="relative w-3.5 h-3.5 bg-orange-500 border-2 border-zinc-950 rounded-full shadow"></div>
        </div>
      `;
      const userOverlay = new HTMLOverlay(userLatLng, userHtml, map, () => {});
      googleOverlaysRef.current.push(userOverlay);

      // Draw Concentric distance indicator rings around user GPS coordinates
      const circle500 = new google.maps.Circle({
        strokeColor: '#f97316',
        strokeOpacity: 0.35,
        strokeWeight: 1.5,
        fillColor: '#f97316',
        fillOpacity: 0.04,
        map: map,
        center: userLatLng,
        radius: 500,
        clickable: false
      });
      googleOverlaysRef.current.push(circle500);

      const circle1000 = new google.maps.Circle({
        strokeColor: '#f97316',
        strokeOpacity: 0.25,
        strokeWeight: 1.2,
        fillColor: '#f97316',
        fillOpacity: 0.02,
        map: map,
        center: userLatLng,
        radius: 1000,
        clickable: false
      });
      googleOverlaysRef.current.push(circle1000);

      const circle2000 = new google.maps.Circle({
        strokeColor: '#3b82f6',
        strokeOpacity: 0.2,
        strokeWeight: 1.0,
        fillColor: '#3b82f6',
        fillOpacity: 0.01,
        map: map,
        center: userLatLng,
        radius: 2000,
        clickable: false
      });
      googleOverlaysRef.current.push(circle2000);

      // Add overlays for Shops
      filteredVendors.forEach((vendor) => {
        const isSelected = selectedVendor?.id === vendor.id;
        const vendorLatLng = new google.maps.LatLng(vendor.latitude, vendor.longitude);
        const storeHtml = `
          <div class="relative flex flex-col items-center">
            <div class="w-9 h-9 rounded-full overflow-hidden border-2 shadow-lg transition-transform duration-200 ${
              isSelected 
                ? 'border-orange-500 scale-110 ring-4 ring-orange-500/20' 
                : 'border-zinc-700 hover:scale-105'
            } bg-zinc-900 flex items-center justify-center">
              <img src="${vendor.logo}" class="w-full h-full object-cover" />
            </div>
            ${vendor.verified ? `
              <div class="absolute -top-1 -right-1 bg-zinc-955 border border-zinc-850 rounded-full p-0.5 shadow">
                <svg class="w-2.5 h-2.5 text-orange-500 fill-current" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l5-5z" clip-rule="evenodd"></path>
                </svg>
              </div>
            ` : ''}
          </div>
        `;
        const shopOverlay = new HTMLOverlay(vendorLatLng, storeHtml, map, () => {
          handleSelectVendor(vendor);
        });
        googleOverlaysRef.current.push(shopOverlay);
      });

      // Add overlays for Riders and Route Polylines
      riders.forEach((rider) => {
        const isSelected = selectedRider?.id === rider.id;
        const riderLatLng = new google.maps.LatLng(rider.latitude, rider.longitude);
        const riderHtml = `
          <div class="relative flex flex-col items-center">
            <div class="w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md transition-all ${
              isSelected 
                ? 'bg-orange-500 border-zinc-950 text-white' 
                : 'bg-emerald-500 border-zinc-950 text-zinc-955'
            }">
              <svg class="w-3.5 h-3.5 fill-current transform rotate-45" viewBox="0 0 24 24">
                <path d="M12 2L2 22l10-4 10 4z" />
              </svg>
            </div>
            <span class="absolute -top-4 bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-300 px-1 py-0.5 rounded shadow whitespace-nowrap">
              ${rider.name.split(' ')[1] || rider.name}
            </span>
          </div>
        `;
        const riderOverlay = new HTMLOverlay(riderLatLng, riderHtml, map, () => {
          handleSelectRider(rider);
        });
        googleOverlaysRef.current.push(riderOverlay);

        // Draw dynamic routing line using google maps polyline
        if (selectedRider?.id === rider.id) {
          const routeLine = new google.maps.Polyline({
            path: [
              { lat: rider.latitude, lng: rider.longitude },
              { lat: rider.destLatitude, lng: rider.destLongitude }
            ],
            strokeColor: '#f97316',
            strokeOpacity: 0.85,
            strokeWeight: 3,
            icons: [{
              icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
              offset: '0',
              repeat: '10px'
            }],
            map: map
          });
          // Track line to delete on redraw
          googleOverlaysRef.current.push(routeLine);
        }
      });
    }

  }, [mapLoaded, filteredVendors, riders, selectedVendor, selectedRider, userLoc, mapEngine]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[82vh] pb-4">
      
      {/* Left Sidebar Pane - Store directory & Search (1 column, hidden on mobile/small viewports) */}
      <div className="hidden lg:flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 overflow-hidden h-full">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-zinc-100">Map Directory</h3>
          </div>
          <span className="text-[10px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-500 font-bold">
            {filteredVendors.length} Listings
          </span>
        </div>

        {/* Dynamic Search Box */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search stores or provisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-4 py-2 border border-zinc-800 bg-zinc-955 text-xs rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
        </div>

        {/* Category Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {['all', 'grocery', 'dairy', 'pharmacy', 'electronics'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-tight shrink-0 transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-955'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Verified checkbox */}
        <label className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase select-none cursor-pointer">
          <input
            type="checkbox"
            checked={onlyVerified}
            onChange={(e) => setOnlyVerified(e.target.checked)}
            className="rounded border-zinc-800 bg-zinc-955 text-orange-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
          />
          Show Verified Shops Only
        </label>

        {/* Scrollable list items */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {isLoadingListings ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              <p className="text-[10px] font-bold text-zinc-500">Fetching live local places...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500 font-medium">
              No matching local shops found.
            </div>
          ) : (
            filteredVendors.map((vendor) => {
              const isSelected = selectedVendor?.id === vendor.id;
              return (
                <div
                  key={vendor.id}
                  onClick={() => handleSelectVendor(vendor)}
                  className={`p-3 border rounded-2xl cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-zinc-950 border-orange-500 shadow-inner'
                      : 'bg-zinc-955 border-zinc-850 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img src={vendor.logo} alt={vendor.name} className="w-8 h-8 rounded-lg object-cover border border-zinc-800 bg-zinc-900 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h4 className="font-bold text-xs text-zinc-200 truncate">{vendor.name}</h4>
                        {vendor.verified && (
                          <CheckCircle className="w-3 h-3 text-zinc-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{vendor.type} • {vendor.distance}</p>
                      
                      <div className="flex items-center gap-3.5 mt-2 text-[10px] text-zinc-450 font-semibold">
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                          {vendor.rating.toFixed(1)}
                        </span>
                        <span>{vendor.stockCount} items in stock</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane - Map Area Canvas (2 columns on large screen, full screen on small viewports) */}
      <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative shadow-sm h-full flex flex-col animate-fade-in">
        
        {/* Absolute Header Overlay */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all shadow cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-4 py-1.5 rounded-xl shadow flex items-center gap-2">
            <Map className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-200">
              {mapEngine === 'google' ? 'Google Maps Dark Terminal' : 'Hyperlocal Leaflet Canvas'}
            </span>
          </div>
        </div>

        {/* Floating active markers statistics */}
        <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-xl shadow">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            {filteredVendors.length} active
          </div>
          <span className="text-zinc-700">•</span>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {riders.length} deliverers
          </div>
        </div>

        {/* Zoom Controls overlays */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
          <button 
            onClick={() => {
              if (mapEngine === 'google' && googleMapInstanceRef.current) {
                googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() + 1);
              } else if (mapRef.current) {
                mapRef.current.zoomIn();
              }
            }}
            className="p-2 bg-zinc-900/95 border border-zinc-855 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl shadow cursor-pointer transition-all animate-fade-in"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              if (mapEngine === 'google' && googleMapInstanceRef.current) {
                googleMapInstanceRef.current.setZoom(googleMapInstanceRef.current.getZoom() - 1);
              } else if (mapRef.current) {
                mapRef.current.zoomOut();
              }
            }}
            className="p-2 bg-zinc-900/95 border border-zinc-855 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl shadow cursor-pointer transition-all animate-fade-in"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Real Dynamic Maps Container (Leaflet / Google Maps Engine) */}
        <div className="flex-1 w-full h-full relative overflow-hidden bg-zinc-950 select-none">
          <div id="real-leaflet-map" className="w-full h-full absolute inset-0 z-0" />
          
          {!mapLoaded && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-xs font-semibold text-zinc-400">Loading satellite coordinate grids...</p>
            </div>
          )}
        </div>

        {/* Slide-open store catalog drawer popup */}
        {selectedVendor && (
          <div className="absolute bottom-6 left-6 right-6 z-30 animate-slide-up max-w-lg mx-auto">
            <div className="matte-card rounded-2xl p-4.5 border border-zinc-800 shadow-sm relative bg-zinc-900">
              
              <button
                onClick={() => setSelectedVendor(null)}
                className="absolute top-2.5 right-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-350 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0">
                  <img src={selectedVendor.logo} alt={selectedVendor.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-zinc-100 text-sm sm:text-base truncate">{selectedVendor.name}</h4>
                    {selectedVendor.verified && (
                      <CheckCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{selectedVendor.type}</p>
                  
                  <div className="flex items-center gap-3.5 mt-2.5 text-[11px] text-zinc-450 font-medium">
                    <span className="flex items-center gap-0.5 text-amber-500 bg-zinc-955 border border-zinc-800/80 px-1.5 py-0.5 rounded font-bold shrink-0">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                      {selectedVendor.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-455 truncate leading-none">
                      <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="text-[10px] inline-block pt-0.5">{selectedVendor.openTime} - {selectedVendor.closeTime}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
                <button
                  onClick={() => router.push(`/stores/${selectedVendor.id}`)}
                  className="w-full text-center py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 hover:text-zinc-900 transition-all font-semibold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  View Store Front
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVendor.latitude},${selectedVendor.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full text-center py-2 bg-zinc-900 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-955 border border-zinc-800 hover:border-zinc-300 transition-all duration-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition-colors shrink-0" />
                  Directions
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Slide-open Rider tracking drawer popup */}
        {selectedRider && (
          <div className="absolute bottom-6 left-6 right-6 z-30 animate-slide-up max-w-lg mx-auto">
            <div className="matte-card rounded-2xl p-4.5 border border-zinc-800 shadow-sm relative bg-zinc-900">
              
              <button
                onClick={() => setSelectedRider(null)}
                className="absolute top-2.5 right-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-350 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-orange-500 shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-zinc-100 text-sm sm:text-base truncate">{selectedRider.name}</h4>
                    <span className="text-[8px] bg-emerald-50/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                      Online
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium mt-1">
                    <span>{selectedRider.vehicle}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="flex items-center gap-1 text-zinc-350">
                      <Battery className="w-3.5 h-3.5 text-emerald-500" />
                      {selectedRider.battery}% Charge
                    </span>
                  </div>

                  <div className="mt-3.5 border-t border-zinc-800/80 pt-3 flex items-center justify-between text-[11px] font-semibold">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Delivering Order to:</span>
                      <span className="text-zinc-200 block truncate max-w-xs">{selectedRider.deliveringTo}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Transit ETA:</span>
                      <span className="text-orange-500 font-black">{selectedRider.eta}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
                <a
                  href="tel:+919876543210"
                  className="group w-full py-2 bg-zinc-900 hover:bg-zinc-100 border border-zinc-800 hover:border-zinc-300 text-zinc-300 hover:text-zinc-950 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 transition-colors" />
                  Call Sunil
                </a>
                <button
                  onClick={() => {
                    const shop = nearbyStores.find(v => v.name === selectedRider.deliveringTo);
                    if (shop) handleSelectVendor(shop);
                  }}
                  className="group w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 hover:text-zinc-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Store className="w-3.5 h-3.5 text-zinc-955 group-hover:text-zinc-900 transition-colors" />
                  Focus Destination
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
