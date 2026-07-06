import { describe, it, expect } from 'vitest';
import { calculateDistance, sortStoresByDistance } from './geo';

describe('calculateDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(calculateDistance(12.9752, 77.6412, 12.9752, 77.6412)).toBe(0);
  });

  it('is symmetric', () => {
    const a = calculateDistance(12.97, 77.64, 12.96, 77.63);
    const b = calculateDistance(12.96, 77.63, 12.97, 77.64);
    expect(a).toBe(b);
  });

  it('rounds the result to one decimal place', () => {
    const d = calculateDistance(12.9752, 77.6412, 12.9702, 77.6368);
    expect(d).toBe(Math.round(d * 10) / 10);
  });

  it('computes a known distance (~111km per degree of latitude)', () => {
    // 1 degree of latitude is ~111.19 km via the Haversine formula.
    const d = calculateDistance(0, 0, 1, 0);
    expect(d).toBeCloseTo(111.2, 0);
  });

  it('increases as points get farther apart', () => {
    const near = calculateDistance(12.9752, 77.6412, 12.9702, 77.6368);
    const far = calculateDistance(12.9752, 77.6412, 12.9610, 77.6355);
    expect(far).toBeGreaterThan(near);
  });
});

describe('sortStoresByDistance', () => {
  const user = { lat: 12.9752, lng: 77.6412 };

  it('sorts stores ascending by distance and annotates each with a distance', () => {
    const stores = [
      { id: 'far', latitude: 12.9610, longitude: 77.6355 },
      { id: 'near', latitude: 12.9750, longitude: 77.6410 },
      { id: 'mid', latitude: 12.9702, longitude: 77.6368 },
    ];

    const sorted = sortStoresByDistance(stores, user.lat, user.lng);

    expect(sorted.map((s) => s.id)).toEqual(['near', 'mid', 'far']);
    sorted.forEach((s) => expect(typeof s.distance).toBe('number'));
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].distance).toBeGreaterThanOrEqual(sorted[i - 1].distance);
    }
  });

  it('preserves the original object fields', () => {
    const stores = [{ id: 's1', name: 'Shop', latitude: 12.97, longitude: 77.64 }];
    const [result] = sortStoresByDistance(stores, user.lat, user.lng);
    expect(result.id).toBe('s1');
    expect(result.name).toBe('Shop');
  });

  it('returns an empty array when given no stores', () => {
    expect(sortStoresByDistance([], user.lat, user.lng)).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const stores = [
      { id: 'a', latitude: 12.96, longitude: 77.63 },
      { id: 'b', latitude: 12.975, longitude: 77.641 },
    ];
    const copy = JSON.parse(JSON.stringify(stores));
    sortStoresByDistance(stores, user.lat, user.lng);
    expect(stores).toEqual(copy);
  });
});
