import { db } from './db';
import { calculateDistance, sortStoresByDistance } from './geo';
import * as mock from './mockData';

// Safe check: decides whether to attempt Prisma database queries or use Mock Data directly
const isPrismaEnabled = () => {
  return typeof process !== 'undefined' && !!process.env.DATABASE_URL;
};

/**
 * Interface representing a product result with nearby store availability aggregated.
 */
export interface ProductSearchResult {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  brand: string;
  minPrice: number;
  maxPrice: number;
  availableStoresCount: number;
  nearestStoreName: string;
  nearestStoreDistance: number;
}

/**
 * Searches products and aggregates their nearby store inventory and local pricing.
 */
export async function searchProducts(
  query: string,
  userLat: number,
  userLng: number,
  dbMode?: string
): Promise<ProductSearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();

  // Mode A: Prisma PostgreSQL
  if (dbMode !== 'mock' && isPrismaEnabled()) {
    try {
      const dbProducts = await db.product.findMany({
        where: normalizedQuery
          ? {
              OR: [
                { name: { contains: normalizedQuery } },
                { brand: { contains: normalizedQuery } },
                { category: { contains: normalizedQuery } },
              ],
            }
          : undefined,
        include: {
          storeProducts: {
            include: {
              store: true,
            },
          },
        },
      });

      return dbProducts
        .map((p) => {
          const matchingInventories = p.storeProducts.filter((s) => s.isAvailable && s.stockCount > 0);
          if (matchingInventories.length === 0) return null;

          const prices = matchingInventories.map((i) => Number(i.price));
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);

          // Calculate distances to find nearest store
          const sortedStores = sortStoresByDistance(
            matchingInventories.map((i) => ({
              ...i.store,
              price: Number(i.price),
            })),
            userLat,
            userLng
          );

          const nearest = sortedStores[0];

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            image: p.image,
            category: p.category,
            brand: p.brand,
            minPrice,
            maxPrice,
            availableStoresCount: matchingInventories.length,
            nearestStoreName: nearest ? nearest.name : 'Unknown Store',
            nearestStoreDistance: nearest ? nearest.distance : 999,
          };
        })
        .filter((item): item is ProductSearchResult => item !== null);
    } catch (error) {
      console.warn('Prisma query failed, falling back to mock dataset:', error);
    }
  }

  // Mode B: Mock Fallback Layer
  const matchedMockProducts = mock.PRODUCTS.filter((p) => {
    if (!normalizedQuery) return true;
    return (
      p.name.toLowerCase().includes(normalizedQuery) ||
      p.brand.toLowerCase().includes(normalizedQuery) ||
      p.category.toLowerCase().includes(normalizedQuery)
    );
  });

  return matchedMockProducts
    .map((p) => {
      // Find all stores selling this product
      const matchingInventories = mock.STORE_PRODUCTS.filter(
        (sp) => sp.productId === p.id && sp.isAvailable && sp.stockCount > 0
      );
      if (matchingInventories.length === 0) return null;

      const prices = matchingInventories.map((i) => i.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Find nearest store
      const storeDistances = matchingInventories.map((i) => {
        const store = mock.STORES.find((s) => s.id === i.storeId)!;
        return {
          ...store,
          price: i.price,
          distance: calculateDistance(userLat, userLng, store.latitude, store.longitude),
        };
      });

      storeDistances.sort((a, b) => a.distance - b.distance);
      const nearest = storeDistances[0];

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.image,
        category: p.category,
        brand: p.brand,
        minPrice,
        maxPrice,
        availableStoresCount: matchingInventories.length,
        nearestStoreName: nearest ? nearest.name : 'Unknown Store',
        nearestStoreDistance: nearest ? nearest.distance : 999,
      };
    })
    .filter((item): item is ProductSearchResult => item !== null);
}

/**
 * Gets details of a product and lists all nearby stores offering it with prices and distances.
 */
export async function getProductAvailability(
  productId: string,
  userLat: number,
  userLng: number,
  dbMode?: string
) {
  // Mode A: Prisma PostgreSQL
  if (dbMode !== 'mock' && isPrismaEnabled()) {
    try {
      const product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product) return null;

      const inventories = await db.storeProduct.findMany({
        where: { productId, isAvailable: true, stockCount: { gt: 0 } },
        include: { store: true },
      });

      const prices = inventories.map((i) => i.price);
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;

      const sortedStores = sortStoresByDistance(
        inventories.map((i) => ({
          id: i.store.id,
          name: i.store.name,
          type: i.store.type,
          address: i.store.address,
          latitude: i.store.latitude,
          longitude: i.store.longitude,
          phone: i.store.phone,
          whatsapp: i.store.whatsapp,
          rating: i.store.rating,
          reviewsCount: i.store.reviewsCount,
          logo: i.store.logo,
          banner: i.store.banner,
          openTime: i.store.openTime,
          closeTime: i.store.closeTime,
          verified: i.store.verified,
          price: i.price,
          stockCount: i.stockCount,
        })),
        userLat,
        userLng
      );

      return {
        product,
        minPrice,
        maxPrice,
        stores: sortedStores,
      };
    } catch (e) {
      console.warn('Prisma query failed for product availability, falling back to mock dataset:', e);
    }
  }

  // Mode B: Mock Fallback Layer
  const product = mock.PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;

  const inventories = mock.STORE_PRODUCTS.filter(
    (sp) => sp.productId === productId && sp.isAvailable && sp.stockCount > 0
  );

  const prices = inventories.map((i) => i.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const sortedStores = sortStoresByDistance(
    inventories.map((i) => {
      const store = mock.STORES.find((s) => s.id === i.storeId)!;
      return {
        ...store,
        price: i.price,
        stockCount: i.stockCount,
      };
    }),
    userLat,
    userLng
  );

  return {
    product,
    minPrice,
    maxPrice,
    stores: sortedStores,
  };
}

/**
 * Gets details of a specific store, its reviews, and its full available product catalog.
 */
export async function getStoreDetails(
  storeId: string,
  userLat: number,
  userLng: number,
  dbMode?: string
) {
  // Mode A: Prisma PostgreSQL
  if (dbMode !== 'mock' && isPrismaEnabled()) {
    try {
      const store = await db.store.findUnique({
        where: { id: storeId },
        include: {
          reviews: {
            orderBy: { createdAt: 'desc' },
          },
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!store) return null;

      const distance = calculateDistance(userLat, userLng, store.latitude, store.longitude);

      const catalog = store.products
        .filter((sp) => sp.isAvailable && sp.stockCount > 0)
        .map((sp) => ({
          ...sp.product,
          price: sp.price,
          stockCount: sp.stockCount,
        }));

      return {
        store: {
          id: store.id,
          name: store.name,
          type: store.type,
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
          phone: store.phone,
          whatsapp: store.whatsapp,
          rating: store.rating,
          reviewsCount: store.reviewsCount,
          logo: store.logo,
          banner: store.banner,
          openTime: store.openTime,
          closeTime: store.closeTime,
          verified: store.verified,
        },
        distance,
        reviews: store.reviews,
        catalog,
      };
    } catch (e) {
      console.warn('Prisma query failed for store details, falling back to mock dataset:', e);
    }
  }

  // Mode B: Mock Fallback Layer
  const store = mock.STORES.find((s) => s.id === storeId);
  if (!store) return null;

  const distance = calculateDistance(userLat, userLng, store.latitude, store.longitude);

  const reviews = mock.REVIEWS.filter((r) => r.storeId === storeId);

  const catalog = mock.STORE_PRODUCTS.filter(
    (sp) => sp.storeId === storeId && sp.isAvailable && sp.stockCount > 0
  ).map((sp) => {
    const product = mock.PRODUCTS.find((p) => p.id === sp.productId)!;
    return {
      ...product,
      price: sp.price,
      stockCount: sp.stockCount,
    };
  });

  return {
    store,
    distance,
    reviews,
    catalog,
  };
}

/**
 * Gets all popular stores, sorted by nearest distance.
 */
export async function getPopularNearbyStores(userLat: number, userLng: number, dbMode?: string) {
  // Mode A: Prisma PostgreSQL
  if (dbMode !== 'mock' && isPrismaEnabled()) {
    try {
      const stores = await db.store.findMany();
      return sortStoresByDistance(stores, userLat, userLng);
    } catch (e) {
      console.warn('Prisma query failed for popular nearby stores, falling back to mock dataset:', e);
    }
  }

  // Mode B: Mock Fallback Layer
  return sortStoresByDistance(mock.STORES, userLat, userLng);
}
