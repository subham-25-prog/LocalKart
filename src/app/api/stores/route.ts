import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateDistance } from '@/lib/geo';
import {
  isPrismaEnabled,
  mapCategory,
  mapType,
  matchProductCategory,
  getRandomPrice,
  getBannerGradient,
  getCategoryUnsplashImage,
} from '@/lib/places';
import { getErrorMessage, parseGeoParams } from '@/lib/apiHelpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { lat, lng, dbMode } = parseGeoParams(searchParams);
    const radius = parseFloat(searchParams.get('radius') || '2000');
    const category = searchParams.get('category') || 'all';

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
    console.error('Hyperlocal stores discovery API failed:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}
