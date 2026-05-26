import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateDistance, sortStoresByDistance } from '@/lib/geo';

// Helper check for Prisma active availability
const isPrismaEnabled = (dbMode?: string | null) => {
  if (dbMode === 'mock') return false;
  return typeof process !== 'undefined' && !!process.env.DATABASE_URL;
};

// Map Google Places types to LocalKart category key
function mapCategory(types: string[]): string {
  if (types.includes('pharmacy') || types.includes('drugstore') || types.includes('hospital') || types.includes('doctor')) {
    return 'pharmacy';
  }
  if (types.includes('electronics_store') || types.includes('home_goods_store')) {
    return 'electronics';
  }
  if (types.includes('restaurant') || types.includes('cafe') || types.includes('bakery') || types.includes('meal_takeaway')) {
    return 'restaurant';
  }
  if (types.includes('clothing_store') || types.includes('shoe_store') || types.includes('department_store')) {
    return 'clothing';
  }
  if (types.includes('car_repair') || types.includes('locksmith') || types.includes('plumber') || types.includes('electrician')) {
    return 'repair';
  }
  return 'grocery'; // Default fallback
}

// Map Google Places types to UI store type labels
function mapType(types: string[]): string {
  if (types.includes('pharmacy')) return 'Pharmacy & Wellness';
  if (types.includes('electronics_store')) return 'Electronics Store';
  if (types.includes('restaurant') || types.includes('cafe')) return 'Restaurant & Cafe';
  if (types.includes('clothing_store')) return 'Clothing & Fashion';
  if (types.includes('car_repair') || types.includes('repair')) return 'Repair & Local Services';
  if (types.includes('supermarket')) return 'Supermarket';
  return 'Grocery Store';
}

// Map product category strings to our custom category keys
function matchProductCategory(productCategory: string, storeCategory: string | null): boolean {
  if (!storeCategory) return true;
  const prodCat = productCategory.toLowerCase();
  const storeCat = storeCategory.toLowerCase();

  if (storeCat === 'grocery') {
    return prodCat.includes('grocery') || prodCat.includes('dairy') || prodCat.includes('fresh') || prodCat.includes('egg');
  }
  if (storeCat === 'pharmacy') {
    return prodCat.includes('pharmacy') || prodCat.includes('crocin') || prodCat.includes('dairy'); // pharmacies sell basic dairy
  }
  if (storeCat === 'electronics') {
    return prodCat.includes('electronics') || prodCat.includes('charger') || prodCat.includes('headphone');
  }
  return true; // default match
}

// Returns a random price based on the product ID for realistic variation
function getRandomPrice(productId: string): number {
  if (productId === 'prod-milk') return 30 + Math.floor(Math.random() * 5);
  if (productId === 'prod-rice') return 100 + Math.floor(Math.random() * 20);
  if (productId === 'prod-eggs') return 78 + Math.floor(Math.random() * 10);
  if (productId === 'prod-charger') return 1300 + Math.floor(Math.random() * 200);
  if (productId === 'prod-headphones') return 4100 + Math.floor(Math.random() * 400);
  if (productId === 'prod-crocin') return 55 + Math.floor(Math.random() * 10);
  if (productId === 'prod-banana') return 40 + Math.floor(Math.random() * 15);
  if (productId === 'prod-bread') return 38 + Math.floor(Math.random() * 8);
  return 50;
}

// Return pre-selected matte colors for premium banner gradients
function getBannerGradient(index: number): string {
  const gradients = [
    'linear-gradient(135deg, #18181b 0%, #27272a 100%)', // Matte zinc
    'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', // Forest emerald
    'linear-gradient(135deg, #082f49 0%, #0c4a6e 100%)', // Steel ocean
    'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', // Dusk indigo
    'linear-gradient(135deg, #4c0519 0%, #58051b 100%)', // Crimson wine
  ];
  return gradients[index % gradients.length];
}

// Dynamic realistic image fallbacks
function getCategoryUnsplashImage(category: string): string {
  const images: Record<string, string> = {
    grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
    pharmacy: 'https://images.unsplash.com/photo-1607619056574-7b8d304a3b24?w=200&h=200&fit=crop',
    electronics: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=200&h=200&fit=crop',
    restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
    clothing: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
    repair: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&h=200&fit=crop'
  };
  return images[category] || images.grocery;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '12.9716');
    const lng = parseFloat(searchParams.get('lng') || '77.6400');
    const radius = parseFloat(searchParams.get('radius') || '2000');
    const category = searchParams.get('category') || 'all';
    const dbMode = searchParams.get('db_mode') || 'postgres';

    // 1. Search cached stores in local PostgreSQL bounding box if database active
    const latDelta = radius / 111000;
    const lngDelta = radius / (111000 * Math.cos((lat * Math.PI) / 180));

    let cachedStores: any[] = [];
    let isDbOperational = false;

    if (isPrismaEnabled(dbMode)) {
      try {
        cachedStores = await db.store.findMany({
          where: {
            latitude: { gte: lat - latDelta, lte: lat + latDelta },
            longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
            category: category !== 'all' ? category : undefined,
            // Check fresh caches (updated in the last 24 hours)
            updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        isDbOperational = true;
      } catch (dbErr) {
        console.warn('Prisma database is currently offline or unreached. Falling back to dynamic live mode:', dbErr);
      }
    }

    // If cache is sufficiently populated, return it directly to conserve Google API credits
    if (cachedStores.length >= 3) {
      const mapped = cachedStores.map((s) => ({
        ...s,
        distance: calculateDistance(lat, lng, s.latitude, s.longitude),
      }));
      mapped.sort((a, b) => a.distance - b.distance);
      return NextResponse.json({ success: true, stores: mapped, source: 'database_cache' });
    }

    // 2. Fetch live results from Google Places API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    let finalStoresList: any[] = [];

    if (!apiKey) {
      // B. Simulate high-fidelity live location-anchored stores near current user GPS
      console.info('Google Maps API key is missing. Generating location-anchored simulated discovery list.');
      
      const simulatedTemplates = [
        { name: 'Fresh Mart Supermarket', type: 'Supermarket', category: 'grocery', phone: '+91 98765 43210', rating: 4.6, offsetLat: 0.0036, offsetLng: 0.0012 },
        { name: 'Sri Krishna Dairy & Provisions', type: 'Dairy & Grocery', category: 'grocery', phone: '+91 98450 12345', rating: 4.8, offsetLat: -0.0014, offsetLng: -0.0032 },
        { name: 'Super Save Hypermarket', type: 'Supermarket', category: 'grocery', phone: '+91 80412 98765', rating: 4.2, offsetLat: -0.0058, offsetLng: 0.0035 },
        { name: 'Quick Meds Pharmacy', type: 'Pharmacy & Wellness', category: 'pharmacy', phone: '+91 99000 88877', rating: 4.5, offsetLat: 0.0069, offsetLng: -0.0015 },
        { name: 'Alpha Electronics', type: 'Electronics Store', category: 'electronics', phone: '+91 91234 56789', rating: 4.4, offsetLat: 0.0074, offsetLng: 0.0055 },
        { name: 'Organic Harvest Co.', type: 'Fresh Produce Store', category: 'grocery', phone: '+91 98888 77777', rating: 4.7, offsetLat: -0.0106, offsetLng: -0.0045 },
        { name: 'The Style Hub', type: 'Clothing & Fashion', category: 'clothing', phone: '+91 97777 66666', rating: 4.3, offsetLat: 0.0022, offsetLng: -0.0048 },
        { name: 'FastFix Repair Services', type: 'Repair & Local Services', category: 'repair', phone: '+91 96666 55555', rating: 4.1, offsetLat: -0.0045, offsetLng: 0.0022 }
      ];

      const filteredSimulated = simulatedTemplates.filter(
        (item) => category === 'all' || item.category === category
      );

      finalStoresList = filteredSimulated.map((item, idx) => {
        const storeLat = lat + item.offsetLat;
        const storeLng = lng + item.offsetLng;
        const dist = calculateDistance(lat, lng, storeLat, storeLng);

        return {
          id: `store-simulated-${idx}-${category}`,
          googlePlaceId: `gplace-simulated-${idx}-${category}`,
          name: item.name,
          type: item.type,
          address: `${10 + idx * 4}, Cross Rd, near ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
          latitude: storeLat,
          longitude: storeLng,
          phone: item.phone,
          whatsapp: item.phone.replace(/[^0-9]/g, ''),
          rating: item.rating,
          reviewsCount: 15 + idx * 8,
          logo: getCategoryUnsplashImage(item.category),
          banner: getBannerGradient(idx),
          openTime: '08:00 AM',
          closeTime: '10:00 PM',
          verified: true,
          category: item.category,
          openNow: idx % 3 !== 0,
          distance: dist
        };
      });
    } else {
      // A. Query Google Places API Nearby Search dynamically
      let searchKeyword = 'grocery pharmacy electronics restaurant clothing shop store';
      if (category === 'grocery') searchKeyword = 'grocery supermarket dairy bread';
      if (category === 'pharmacy') searchKeyword = 'pharmacy chemist medical drug';
      if (category === 'electronics') searchKeyword = 'electronics electric appliance repair';
      if (category === 'restaurant') searchKeyword = 'restaurant cafe bakery food eat';
      if (category === 'clothing') searchKeyword = 'clothing fashion boutique apparel shoe';
      if (category === 'repair') searchKeyword = 'repair mechanic service locksmith plumber';

      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(
        searchKeyword
      )}&key=${apiKey}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.results) {
        const places = data.results.slice(0, 10); // Grab top 10 dynamic nearby shops

        for (let idx = 0; idx < places.length; idx++) {
          const place = places[idx];
          const placeLat = place.geometry.location.lat;
          const placeLng = place.geometry.location.lng;
          const placeCat = mapCategory(place.types);
          const dist = calculateDistance(lat, lng, placeLat, placeLng);

          const mainImage = place.photos && place.photos.length > 0
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
            : getCategoryUnsplashImage(placeCat);

          const storeData = {
            name: place.name || 'Local Store',
            type: mapType(place.types),
            address: place.vicinity || 'Local Main St',
            latitude: placeLat,
            longitude: placeLng,
            phone: '+91 98765 43210',
            logo: mainImage,
            banner: getBannerGradient(idx),
            rating: place.rating || 4.2,
            verified: true,
            category: placeCat,
            openNow: place.opening_hours?.open_now ?? true,
          };

          // Cache dynamically inside PostgreSQL if operational
          let savedStore: any = null;
          if (isDbOperational) {
            try {
              savedStore = await db.store.upsert({
                where: { googlePlaceId: place.place_id },
                update: {
                  name: storeData.name,
                  address: storeData.address,
                  latitude: storeData.latitude,
                  longitude: storeData.longitude,
                  rating: storeData.rating,
                  openNow: storeData.openNow,
                  updatedAt: new Date(),
                },
                create: {
                  googlePlaceId: place.place_id,
                  name: storeData.name,
                  type: storeData.type,
                  address: storeData.address,
                  latitude: storeData.latitude,
                  longitude: storeData.longitude,
                  phone: storeData.phone,
                  whatsapp: storeData.phone.replace(/[^0-9]/g, ''),
                  logo: storeData.logo,
                  banner: storeData.banner,
                  rating: storeData.rating,
                  openNow: storeData.openNow,
                  category: storeData.category,
                  openTime: '08:00 AM',
                  closeTime: '10:00 PM',
                },
              });

              // Dynamic Inventory mapping - link seed products to discovered places
              const existingMappingCount = await db.storeProduct.count({
                where: { storeId: savedStore.id },
              });

              if (existingMappingCount === 0) {
                const dbProducts = await db.product.findMany();
                const matchedProducts = dbProducts.filter((p) =>
                  matchProductCategory(p.category, savedStore.category)
                );

                for (const prod of matchedProducts.slice(0, 5)) {
                  await db.storeProduct.create({
                    data: {
                      storeId: savedStore.id,
                      productId: prod.id,
                      price: getRandomPrice(prod.id),
                      stockCount: Math.floor(Math.random() * 80) + 20,
                      isAvailable: true,
                    },
                  });
                }
              }
            } catch (upsertErr) {
              console.warn('Upsert or seed mapping failed for database store, running memory only:', upsertErr);
            }
          }

          finalStoresList.push({
            id: savedStore?.id || place.place_id,
            googlePlaceId: place.place_id,
            ...storeData,
            whatsapp: storeData.phone.replace(/[^0-9]/g, ''),
            reviewsCount: place.user_ratings_total || 24,
            openTime: '08:00 AM',
            closeTime: '10:00 PM',
            distance: dist,
          });
        }
      } else {
        // Fetch failed or zero results, use simulated fallback
        console.warn('Google Places call was not successful. Triggering simulated fallback list.');
        return GET(new Request(`${request.url.split('?')[0]}?lat=${lat}&lng=${lng}&radius=${radius}&category=${category}`)); // trigger simulated lookup
      }
    }

    finalStoresList.sort((a, b) => a.distance - b.distance);
    return NextResponse.json({ success: true, stores: finalStoresList, source: apiKey ? 'google_places_api' : 'simulated' });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Hyperlocal stores discovery API failed:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
