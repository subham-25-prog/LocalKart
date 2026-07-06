import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getWishlist, setWishlist, toggleWishlistItem, WISHLIST_KEY, WISHLIST_EVENT } from './wishlist';

const LEGACY_WISHLIST_KEY = 'localkart_wishlist';

describe('wishlist', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getWishlist', () => {
    it('returns an empty array when nothing is stored', () => {
      expect(getWishlist()).toEqual([]);
    });

    it('returns the stored list of ids', () => {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(['a', 'b']));
      expect(getWishlist()).toEqual(['a', 'b']);
    });

    it('migrates the legacy key to the current key and removes the legacy entry', () => {
      localStorage.setItem(LEGACY_WISHLIST_KEY, JSON.stringify(['x']));
      expect(getWishlist()).toEqual(['x']);
      expect(localStorage.getItem(WISHLIST_KEY)).toBe(JSON.stringify(['x']));
      expect(localStorage.getItem(LEGACY_WISHLIST_KEY)).toBeNull();
    });

    it('prefers the current key over the legacy key', () => {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(['current']));
      localStorage.setItem(LEGACY_WISHLIST_KEY, JSON.stringify(['legacy']));
      expect(getWishlist()).toEqual(['current']);
    });

    it('returns an empty array when stored value is not an array', () => {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify({ not: 'an array' }));
      expect(getWishlist()).toEqual([]);
    });

    it('returns an empty array when stored JSON is corrupt', () => {
      localStorage.setItem(WISHLIST_KEY, 'broken');
      expect(getWishlist()).toEqual([]);
    });
  });

  describe('setWishlist', () => {
    it('stores the ids, clears the legacy key, and dispatches an event', () => {
      localStorage.setItem(LEGACY_WISHLIST_KEY, JSON.stringify(['old']));
      const listener = vi.fn();
      window.addEventListener(WISHLIST_EVENT, listener);

      setWishlist(['a', 'b']);

      expect(localStorage.getItem(WISHLIST_KEY)).toBe(JSON.stringify(['a', 'b']));
      expect(localStorage.getItem(LEGACY_WISHLIST_KEY)).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener(WISHLIST_EVENT, listener);
    });
  });

  describe('toggleWishlistItem', () => {
    it('adds an id that is not yet present', () => {
      expect(toggleWishlistItem('p1')).toEqual(['p1']);
      expect(getWishlist()).toEqual(['p1']);
    });

    it('removes an id that is already present', () => {
      setWishlist(['p1', 'p2']);
      expect(toggleWishlistItem('p1')).toEqual(['p2']);
      expect(getWishlist()).toEqual(['p2']);
    });
  });
});
