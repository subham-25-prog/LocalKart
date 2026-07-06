export type LocalKartRole = 'buyer' | 'seller' | 'admin';

export interface LocalKartUser {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: LocalKartRole;
  membership?: string;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

const SESSION_KEY = 'localkart_user';
const TOKEN_KEY = 'localkart_auth_token';
const SESSION_EVENT = 'localkart_user_updated';

export function getStoredUser(): LocalKartUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  if (!raw || !token) return null;

  try {
    return JSON.parse(raw);
  } catch {
    clearSession(false);
    return null;
  }
}

export function setSession(user: LocalKartUser, token?: string) {
  if (typeof window === 'undefined') return;
  const authToken = token || generateToken();
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, authToken);
  document.cookie = `${TOKEN_KEY}=${authToken}; path=/; max-age=604800; SameSite=Lax`;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession(redirect = true) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('localkart_trigger_login');
  localStorage.removeItem('localkart_cart');
  localStorage.removeItem('localkart_saved_products');
  localStorage.removeItem('localkart_wishlist');
  localStorage.removeItem('localkart_active_tracking_order_id');
  localStorage.removeItem('localkart_active_tracking_status');
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  sessionStorage.clear();
  window.dispatchEvent(new Event(SESSION_EVENT));
  window.dispatchEvent(new CustomEvent('localkart_cart_updated', { detail: null }));
  window.dispatchEvent(new CustomEvent('localkart_wishlist_updated', { detail: [] }));
  if (redirect) {
    window.location.assign('/login');
  }
}

export function requireRole(role?: LocalKartRole) {
  const user = getStoredUser();
  if (!user || (role && user.role !== role)) {
    return null;
  }
  return user;
}

export { SESSION_EVENT };
