const WISHLIST_KEY = 'localkart_saved_products';
const LEGACY_WISHLIST_KEY = 'localkart_wishlist';
const EVENT_NAME = 'localkart_wishlist_updated';

export function getWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  const current = localStorage.getItem(WISHLIST_KEY);
  const legacy = localStorage.getItem(LEGACY_WISHLIST_KEY);
  const raw = current || legacy;
  if (!raw) return [];

  try {
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return [];
    if (!current && legacy) {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
      localStorage.removeItem(LEGACY_WISHLIST_KEY);
    }
    return ids;
  } catch {
    return [];
  }
}

export function setWishlist(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  localStorage.removeItem(LEGACY_WISHLIST_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: ids }));
}

export function toggleWishlistItem(productId: string) {
  const ids = getWishlist();
  const updated = ids.includes(productId)
    ? ids.filter((id) => id !== productId)
    : [...ids, productId];
  setWishlist(updated);
  return updated;
}

export { WISHLIST_KEY, EVENT_NAME as WISHLIST_EVENT };
