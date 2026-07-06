import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getStoredUser,
  setSession,
  clearSession,
  requireRole,
  SESSION_EVENT,
  type LocalKartUser,
} from './auth';

const SESSION_KEY = 'localkart_user';
const TOKEN_KEY = 'localkart_auth_token';

const user: LocalKartUser = {
  id: 'u1',
  name: 'Aarav',
  email: 'aarav@example.com',
  phone: '+91 98765 43210',
  role: 'buyer',
};

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  });
}

describe('auth', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearCookies();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getStoredUser', () => {
    it('returns null when no session is stored', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('returns null when the user is present but the token is missing', () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      expect(getStoredUser()).toBeNull();
    });

    it('returns the parsed user when both user and token exist', () => {
      setSession(user, 'tok');
      expect(getStoredUser()).toEqual(user);
    });

    it('clears the session and returns null when stored user JSON is corrupt', () => {
      localStorage.setItem(SESSION_KEY, 'not-json');
      localStorage.setItem(TOKEN_KEY, 'tok');
      expect(getStoredUser()).toBeNull();
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  describe('setSession', () => {
    it('persists the user and provided token, and sets a cookie', () => {
      setSession(user, 'my-token');
      expect(localStorage.getItem(SESSION_KEY)).toBe(JSON.stringify(user));
      expect(localStorage.getItem(TOKEN_KEY)).toBe('my-token');
      expect(document.cookie).toContain(`${TOKEN_KEY}=my-token`);
    });

    it('generates a role-based token when none is provided', () => {
      setSession({ ...user, role: 'seller' });
      expect(localStorage.getItem(TOKEN_KEY)).toMatch(/^local_seller_\d+$/);
    });

    it('dispatches the session-updated event', () => {
      const listener = vi.fn();
      window.addEventListener(SESSION_EVENT, listener);
      setSession(user, 'tok');
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener(SESSION_EVENT, listener);
    });
  });

  describe('clearSession', () => {
    it('removes session keys and related app storage without redirecting', () => {
      setSession(user, 'tok');
      localStorage.setItem('localkart_cart', '{}');
      localStorage.setItem('localkart_saved_products', '[]');

      clearSession(false);

      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem('localkart_cart')).toBeNull();
      expect(localStorage.getItem('localkart_saved_products')).toBeNull();
    });

    it('redirects to /login when redirect is true', () => {
      const assign = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { ...window.location, assign },
        writable: true,
      });
      setSession(user, 'tok');
      clearSession(true);
      expect(assign).toHaveBeenCalledWith('/login');
    });
  });

  describe('requireRole', () => {
    it('returns null when no user is signed in', () => {
      expect(requireRole()).toBeNull();
      expect(requireRole('buyer')).toBeNull();
    });

    it('returns the user when no specific role is required', () => {
      setSession(user, 'tok');
      expect(requireRole()).toEqual(user);
    });

    it('returns the user when the role matches', () => {
      setSession({ ...user, role: 'seller' }, 'tok');
      expect(requireRole('seller')).toMatchObject({ role: 'seller' });
    });

    it('returns null when the role does not match', () => {
      setSession({ ...user, role: 'buyer' }, 'tok');
      expect(requireRole('admin')).toBeNull();
    });
  });
});
