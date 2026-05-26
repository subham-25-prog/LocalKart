export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  brand: string;
  image: string;
}

export interface Cart {
  storeId: string;
  storeName: string;
  items: CartItem[];
}

const CART_KEY = 'localkart_cart';

export function getCart(): Cart | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse cart:', e);
    return null;
  }
}

export function addToCart(
  storeId: string,
  storeName: string,
  product: { id: string; name: string; price: number; brand?: string; image: string },
  qty: number = 1
): { success: boolean; storeMismatch?: boolean; existingStoreName?: string } {
  const current = getCart();

  if (current && current.storeId !== storeId && current.items.length > 0) {
    return {
      success: false,
      storeMismatch: true,
      existingStoreName: current.storeName
    };
  }

  const items = current ? [...current.items] : [];
  const existingIdx = items.findIndex((i) => i.productId === product.id);

  if (existingIdx > -1) {
    items[existingIdx].qty = Math.max(1, items[existingIdx].qty + qty);
  } else {
    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      brand: product.brand || 'Local',
      image: product.image
    });
  }

  const newCart: Cart = {
    storeId,
    storeName,
    items
  };

  localStorage.setItem(CART_KEY, JSON.stringify(newCart));
  window.dispatchEvent(new CustomEvent('localkart_cart_updated', { detail: newCart }));
  return { success: true };
}

export function updateCartQty(productId: string, qty: number): Cart | null {
  const current = getCart();
  if (!current) return null;

  const items = [...current.items];
  const idx = items.findIndex((i) => i.productId === productId);

  if (idx > -1) {
    if (qty <= 0) {
      items.splice(idx, 1);
    } else {
      items[idx].qty = qty;
    }
  }

  let newCart: Cart | null = null;
  if (items.length === 0) {
    localStorage.removeItem(CART_KEY);
  } else {
    newCart = {
      ...current,
      items
    };
    localStorage.setItem(CART_KEY, JSON.stringify(newCart));
  }

  window.dispatchEvent(new CustomEvent('localkart_cart_updated', { detail: newCart }));
  return newCart;
}

export function clearCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new CustomEvent('localkart_cart_updated', { detail: null }));
}

export function getCartSummary() {
  const cart = getCart();
  if (!cart || cart.items.length === 0) {
    return {
      subtotal: 0,
      deliveryFee: 0,
      groupDiscount: 0,
      platformFee: 0,
      total: 0
    };
  }

  const subtotal = cart.items.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
  const deliveryFee = 15;
  const platformFee = 2;
  const groupDiscount = subtotal >= 100 ? 20 : 0;
  const total = Math.max(0, subtotal + deliveryFee + platformFee - groupDiscount);

  return {
    subtotal,
    deliveryFee,
    groupDiscount,
    platformFee,
    total
  };
}
