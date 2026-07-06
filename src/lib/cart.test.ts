import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getCart,
  addToCart,
  updateCartQty,
  clearCart,
  getCartSummary,
  type Cart,
} from './cart';

const CART_KEY = 'localkart_cart';

const product = {
  id: 'prod-milk',
  name: 'Amul Taaza Fresh Milk (1L)',
  price: 32,
  brand: 'Amul',
  image: 'milk.png',
};

function readStoredCart(): Cart | null {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : null;
}

describe('cart', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getCart', () => {
    it('returns null when nothing is stored', () => {
      expect(getCart()).toBeNull();
    });

    it('returns the parsed cart when present', () => {
      const cart: Cart = { storeId: 's1', storeName: 'Store', items: [] };
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      expect(getCart()).toEqual(cart);
    });

    it('returns null and logs when stored JSON is corrupt', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(CART_KEY, '{not valid json');
      expect(getCart()).toBeNull();
      expect(err).toHaveBeenCalled();
    });
  });

  describe('addToCart', () => {
    it('adds a new item to an empty cart', () => {
      const res = addToCart('s1', 'Fresh Mart', product, 2);
      expect(res).toEqual({ success: true });

      const cart = readStoredCart();
      expect(cart?.storeId).toBe('s1');
      expect(cart?.storeName).toBe('Fresh Mart');
      expect(cart?.items).toHaveLength(1);
      expect(cart?.items[0]).toMatchObject({ productId: 'prod-milk', qty: 2, brand: 'Amul' });
    });

    it('defaults qty to 1 and brand to "Local" when omitted', () => {
      addToCart('s1', 'Fresh Mart', { id: 'p2', name: 'X', price: 10, image: 'x.png' });
      const item = readStoredCart()?.items[0];
      expect(item?.qty).toBe(1);
      expect(item?.brand).toBe('Local');
    });

    it('increments quantity when the same product is added again', () => {
      addToCart('s1', 'Fresh Mart', product, 1);
      addToCart('s1', 'Fresh Mart', product, 2);
      const cart = readStoredCart();
      expect(cart?.items).toHaveLength(1);
      expect(cart?.items[0].qty).toBe(3);
    });

    it('keeps qty at a minimum of 1 when a negative delta would go below', () => {
      addToCart('s1', 'Fresh Mart', product, 1);
      addToCart('s1', 'Fresh Mart', product, -5);
      expect(readStoredCart()?.items[0].qty).toBe(1);
    });

    it('rejects adding a product from a different store while a cart exists', () => {
      addToCart('s1', 'Fresh Mart', product, 1);
      const res = addToCart('s2', 'Other Store', { ...product, id: 'p9' }, 1);
      expect(res).toEqual({
        success: false,
        storeMismatch: true,
        existingStoreName: 'Fresh Mart',
      });
      // Original cart is untouched.
      expect(readStoredCart()?.storeId).toBe('s1');
      expect(readStoredCart()?.items).toHaveLength(1);
    });

    it('dispatches a cart-updated event', () => {
      const listener = vi.fn();
      window.addEventListener('localkart_cart_updated', listener);
      addToCart('s1', 'Fresh Mart', product, 1);
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener('localkart_cart_updated', listener);
    });
  });

  describe('updateCartQty', () => {
    it('returns null when there is no cart', () => {
      expect(updateCartQty('prod-milk', 3)).toBeNull();
    });

    it('updates the quantity of an existing item', () => {
      addToCart('s1', 'Fresh Mart', product, 1);
      const cart = updateCartQty('prod-milk', 5);
      expect(cart?.items[0].qty).toBe(5);
      expect(readStoredCart()?.items[0].qty).toBe(5);
    });

    it('removes the item and clears storage when qty drops to 0', () => {
      addToCart('s1', 'Fresh Mart', product, 1);
      const cart = updateCartQty('prod-milk', 0);
      expect(cart).toBeNull();
      expect(localStorage.getItem(CART_KEY)).toBeNull();
    });

    it('leaves the cart unchanged when the product is not found', () => {
      addToCart('s1', 'Fresh Mart', product, 2);
      const cart = updateCartQty('does-not-exist', 9);
      expect(cart?.items[0].qty).toBe(2);
    });
  });

  describe('clearCart', () => {
    it('removes the stored cart and dispatches an event', () => {
      addToCart('s1', 'Fresh Mart', product, 1);
      const listener = vi.fn();
      window.addEventListener('localkart_cart_updated', listener);
      clearCart();
      expect(localStorage.getItem(CART_KEY)).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener('localkart_cart_updated', listener);
    });
  });

  describe('getCartSummary', () => {
    it('returns all-zero totals for an empty cart', () => {
      expect(getCartSummary()).toEqual({
        subtotal: 0,
        deliveryFee: 0,
        groupDiscount: 0,
        platformFee: 0,
        total: 0,
      });
    });

    it('computes totals without discount below the 100 threshold', () => {
      addToCart('s1', 'Fresh Mart', { ...product, price: 32 }, 1);
      const summary = getCartSummary();
      expect(summary.subtotal).toBe(32);
      expect(summary.deliveryFee).toBe(15);
      expect(summary.platformFee).toBe(2);
      expect(summary.groupDiscount).toBe(0);
      expect(summary.total).toBe(32 + 15 + 2);
    });

    it('applies the group discount when subtotal reaches 100', () => {
      addToCart('s1', 'Fresh Mart', { ...product, price: 50 }, 2); // subtotal 100
      const summary = getCartSummary();
      expect(summary.subtotal).toBe(100);
      expect(summary.groupDiscount).toBe(20);
      expect(summary.total).toBe(100 + 15 + 2 - 20);
    });
  });
});
