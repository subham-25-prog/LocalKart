import { NextResponse } from 'next/server';
import { getStoreDetails } from '@/lib/services';
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
import { parseGeoParams } from '@/lib/apiHelpers';

// Dynamically imports any native Google Place on click, registers and caches it in PostgreSQL
async function importStoreByPlaceId(placeId: string, lat: number, lng: number, apiKey: string, dbMode?: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,formatted_phone_number,rating,opening_hours,types,photos,user_ratings_total,reviews&key=${apiKey}`;
    const res = await fetch(url);
    const detailsData = await res.json();

    if (detailsData.status === 'OK' && detailsData.result) {
      const result = detailsData.result;
      const placeLat = result.geometry.location.lat;
      const placeLng = result.geometry.location.lng;
      const placeCat = mapCategory(result.types || []);
      const placeType = mapType(result.types || []);
      const phone = result.formatted_phone_number || '+91 98765 43210';

      const mainImage = result.photos && result.photos.length > 0
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${result.photos[0].photo_reference}&key=${apiKey}`
        : getCategoryUnsplashImage(placeCat);

      let savedStore: any = null;
      if (isPrismaEnabled(dbMode)) {
        try {
          savedStore = await db.store.upsert({
            where: { googlePlaceId: placeId },
            update: {
              name: result.name,
              address: result.formatted_address || 'Local Main St',
              latitude: placeLat,
              longitude: placeLng,
              rating: result.rating || 4.2,
              openNow: result.opening_hours?.open_now ?? true,
              updatedAt: new Date()
            },
            create: {
              googlePlaceId: placeId,
              name: result.name,
              type: placeType,
              address: result.formatted_address || 'Local Main St',
              latitude: placeLat,
              longitude: placeLng,
              phone: phone,
              whatsapp: phone.replace(/[^0-9]/g, ''),
              logo: mainImage,
              banner: getBannerGradient(0),
              rating: result.rating || 4.2,
              openNow: result.opening_hours?.open_now ?? true,
              category: placeCat,
              openTime: '08:00 AM',
              closeTime: '10:00 PM',
            }
          });

          // Seed dynamic store products
          const existingMappingCount = await db.storeProduct.count({
            where: { storeId: savedStore.id }
          });
          if (existingMappingCount === 0) {
            const dbProducts = await db.product.findMany();
            const matchedProducts = dbProducts.filter(p => matchProductCategory(p.category, savedStore.category));
            for (const prod of matchedProducts.slice(0, 5)) {
              await db.storeProduct.create({
                data: {
                  storeId: savedStore.id,
                  productId: prod.id,
                  price: getRandomPrice(prod.id),
                  stockCount: Math.floor(Math.random() * 80) + 20,
                  isAvailable: true
                }
              });
            }
          }
          
          // Seed reviews
          const reviewCount = await db.review.count({ where: { storeId: savedStore.id } });
          if (reviewCount === 0 && result.reviews && result.reviews.length > 0) {
            for (const r of result.reviews.slice(0, 5)) {
              await db.review.create({
                data: {
                  storeId: savedStore.id,
                  userName: r.author_name,
                  rating: r.rating || 5,
                  comment: r.text || 'Excellent local service!',
                  date: r.relative_time_description || '2 days ago'
                }
              });
            }
          }
        } catch (dbErr) {
          console.warn("DB offline during place import:", dbErr);
        }
      }

      const distance = calculateDistance(lat, lng, placeLat, placeLng);
      
      const responseStore = {
        id: savedStore?.id || placeId,
        googlePlaceId: placeId,
        name: result.name,
        type: placeType,
        address: result.formatted_address || 'Local Main St',
        latitude: placeLat,
        longitude: placeLng,
        phone: phone,
        whatsapp: phone.replace(/[^0-9]/g, ''),
        logo: mainImage,
        banner: getBannerGradient(0),
        rating: result.rating || 4.2,
        verified: true,
        openTime: '08:00 AM',
        closeTime: '10:00 PM',
        reviewsCount: result.user_ratings_total || 10,
        isOpen: result.opening_hours?.open_now ?? true,
        category: placeCat
      };

      // Query products for catalog
      let catalog: any[] = [];
      if (savedStore) {
        try {
          const linkedProds = await db.storeProduct.findMany({
            where: { storeId: savedStore.id },
            include: { product: true }
          });
          catalog = linkedProds.map(lp => ({
            id: lp.product.id,
            name: lp.product.name,
            description: lp.product.description,
            image: lp.product.image,
            category: lp.product.category,
            brand: lp.product.brand,
            price: lp.price,
            stockCount: lp.stockCount
          }));
        } catch (catErr) {
          console.warn("Catalog fetch failed during import:", catErr);
        }
      }

      // Query reviews
      let reviews: any[] = [];
      if (savedStore) {
        try {
          const dbReviews = await db.review.findMany({
            where: { storeId: savedStore.id }
          });
          reviews = dbReviews.map(r => ({
            id: r.id,
            storeId: r.storeId,
            userName: r.userName,
            rating: r.rating,
            comment: r.comment,
            date: r.date
          }));
        } catch (revErr) {
          console.warn("Reviews fetch failed during import:", revErr);
        }
      }

      return {
        store: responseStore,
        distance,
        catalog,
        reviews
      };
    }
  } catch (err) {
    console.error("Place import failed:", err);
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const { searchParams } = new URL(request.url);
    const { lat, lng, dbMode } = parseGeoParams(searchParams);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // 1. Fetch store from services
    let data = await getStoreDetails(id, lat, lng, dbMode);
    
    // 2. Dynamic import if not found locally but ID is Google Place ID and API key loaded
    if (!data && id.startsWith('ChI') && apiKey) {
      console.info(`POI selected. Dynamically importing Place details for ID: ${id}`);
      data = await importStoreByPlaceId(id, lat, lng, apiKey, dbMode);
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      );
    }

    const storeObj = data.store as any;

    // 3. Query Google Place Details lazily for real reviews and details if googlePlaceId exists and wasn't imported just now
    if (storeObj && storeObj.googlePlaceId && apiKey && isPrismaEnabled(dbMode) && data.reviews?.length <= 2) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${storeObj.googlePlaceId}&fields=formatted_phone_number,website,reviews,opening_hours&key=${apiKey}`;
        const res = await fetch(url);
        const detailsData = await res.json();

        if (detailsData.status === 'OK' && detailsData.result) {
          const result = detailsData.result;
          const phone = result.formatted_phone_number || storeObj.phone;
          const openNow = result.opening_hours?.open_now ?? storeObj.openNow;

          // Update store contact info in DB
          await db.store.update({
            where: { id },
            data: {
              phone,
              openNow,
              whatsapp: phone.replace(/[^0-9]/g, '')
            }
          });

          storeObj.phone = phone;
          storeObj.whatsapp = phone.replace(/[^0-9]/g, '');
          storeObj.openNow = openNow;

          // Sync Google reviews with local Review model in DB
          if (result.reviews && result.reviews.length > 0) {
            const currentReviewsCount = await db.review.count({ where: { storeId: id } });
            
            // Only cache if reviews aren't already populated
            if (currentReviewsCount <= 2) {
              await db.review.deleteMany({ where: { storeId: id } });

              for (const r of result.reviews.slice(0, 5)) {
                await db.review.create({
                  data: {
                    storeId: id,
                    userName: r.author_name,
                    rating: r.rating || 5,
                    comment: r.text || 'Excellent local service and catalog!',
                    date: r.relative_time_description || '2 days ago'
                  }
                });
              }
            }

            // Reload reviews from DB
            const freshReviews = await db.review.findMany({
              where: { storeId: id },
              orderBy: { createdAt: 'desc' }
            });
            data.reviews = freshReviews.map(r => ({
              id: r.id,
              storeId: r.storeId,
              userName: r.userName,
              rating: r.rating,
              comment: r.comment,
              date: r.date
            }));
          }
        }
      } catch (detailsErr) {
        console.warn("Lazy fetch of Google Place Details failed or DB offline, bypassing:", detailsErr);
      }
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    console.error('Error in store details API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch store details' },
      { status: 500 }
    );
  }
}
