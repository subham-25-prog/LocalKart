import { describe, it, expect, vi } from 'vitest';
import {
  searchProducts,
  getProductAvailability,
  getStoreDetails,
  getPopularNearbyStores,
} from './services';
import * as mock from './mockData';

// The DB module instantiates a Prisma client at import time; stub it so the
// mock-data code path can be exercised without a real database.
vi.mock('./db', () => ({ db: {} }));

// User positioned exactly at Fresh Mart so it is the nearest store.
const FRESHMART = { lat: 12.9752, lng: 77.6412 };

describe('services (mock mode)', () => {
  describe('searchProducts', () => {
    it('aggregates price range and store count for a matching query', async () => {
      const results = await searchProducts('milk', FRESHMART.lat, FRESHMART.lng, 'mock');
      const milk = results.find((r) => r.id === 'prod-milk');
      expect(milk).toBeDefined();
      // Milk is sold by 4 stores at prices 30, 31.5, 32, 33.
      expect(milk!.availableStoresCount).toBe(4);
      expect(milk!.minPrice).toBe(30);
      expect(milk!.maxPrice).toBe(33);
      expect(milk!.nearestStoreName).toBe('Fresh Mart Supermarket');
      expect(milk!.nearestStoreDistance).toBe(0);
    });

    it('matches on brand and category, case-insensitively', async () => {
      const byBrand = await searchProducts('AMUL', FRESHMART.lat, FRESHMART.lng, 'mock');
      expect(byBrand.some((r) => r.id === 'prod-milk')).toBe(true);

      const byCategory = await searchProducts('electronics', FRESHMART.lat, FRESHMART.lng, 'mock');
      const ids = byCategory.map((r) => r.id);
      expect(ids).toContain('prod-charger');
      expect(ids).toContain('prod-headphones');
    });

    it('returns every product that has stock for an empty query', async () => {
      const results = await searchProducts('', FRESHMART.lat, FRESHMART.lng, 'mock');
      // Every returned product must have at least one available store.
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => expect(r.availableStoresCount).toBeGreaterThan(0));
    });

    it('returns an empty array when nothing matches', async () => {
      const results = await searchProducts('nonexistent-xyz', FRESHMART.lat, FRESHMART.lng, 'mock');
      expect(results).toEqual([]);
    });

    it('excludes products that have no available inventory', async () => {
      const spy = vi.spyOn(mock.STORE_PRODUCTS, 'filter');
      // Ensure a product with only unavailable stock is filtered out entirely.
      const results = await searchProducts('milk', FRESHMART.lat, FRESHMART.lng, 'mock');
      results.forEach((r) => expect(r.availableStoresCount).toBeGreaterThan(0));
      spy.mockRestore();
    });
  });

  describe('getProductAvailability', () => {
    it('returns product details with sorted stores', async () => {
      const res = await getProductAvailability('prod-milk', FRESHMART.lat, FRESHMART.lng, 'mock');
      expect(res).not.toBeNull();
      expect(res!.product.id).toBe('prod-milk');
      expect(res!.minPrice).toBe(30);
      expect(res!.maxPrice).toBe(33);
      expect(res!.stores.length).toBe(4);
      // Stores are sorted ascending by distance.
      for (let i = 1; i < res!.stores.length; i++) {
        expect(res!.stores[i].distance).toBeGreaterThanOrEqual(res!.stores[i - 1].distance);
      }
    });

    it('returns null for an unknown product', async () => {
      const res = await getProductAvailability('does-not-exist', FRESHMART.lat, FRESHMART.lng, 'mock');
      expect(res).toBeNull();
    });
  });

  describe('getStoreDetails', () => {
    it('returns the store with its reviews and available catalog', async () => {
      const res = await getStoreDetails('store-freshmart', FRESHMART.lat, FRESHMART.lng, 'mock');
      expect(res).not.toBeNull();
      expect(res!.store.id).toBe('store-freshmart');
      expect(res!.distance).toBe(0);
      // Fresh Mart has 2 seeded reviews and 5 in-stock products.
      expect(res!.reviews.length).toBe(2);
      expect(res!.catalog.length).toBe(5);
      res!.catalog.forEach((item) => {
        expect(item).toHaveProperty('price');
        expect(item).toHaveProperty('stockCount');
      });
    });

    it('returns null for an unknown store', async () => {
      const res = await getStoreDetails('no-store', FRESHMART.lat, FRESHMART.lng, 'mock');
      expect(res).toBeNull();
    });
  });

  describe('getPopularNearbyStores', () => {
    it('returns all stores sorted by ascending distance', async () => {
      const stores = await getPopularNearbyStores(FRESHMART.lat, FRESHMART.lng, 'mock');
      expect(stores.length).toBe(mock.STORES.length);
      for (let i = 1; i < stores.length; i++) {
        expect(stores[i].distance).toBeGreaterThanOrEqual(stores[i - 1].distance);
      }
      expect(stores[0].id).toBe('store-freshmart');
    });
  });
});
