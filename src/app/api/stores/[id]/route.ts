import { NextResponse } from 'next/server';
import { getStoreDetails } from '@/lib/services';
import { db } from '@/lib/db';
import { calculateDistance } from '@/lib/geo';

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
  return 'grocery';
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
    return prodCat.includes('pharmacy') || prodCat.includes('crocin') || prodCat.includes('dairy');
  }
  if (storeCat === 'electronics') {
    return prodCat.includes('electronics') || prodCat.includes('charger') || prodCat.includes('headphone');
  }
  return true;
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
    'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
    'linear-gradient(135deg, #082f49 0%, #0c4a6e 100%)',
    'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
    'linear-gradient(135deg, #4c0519 0%, #58051b 100%)',
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
    const lat = parseFloat(searchParams.get('lat') || '12.9716');
    const lng = parseFloat(searchParams.get('lng') || '77.6400');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const dbMode = searchParams.get('db_mode') || 'postgres';

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
    const err = error as Error;
    console.error('Error in store details API:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
