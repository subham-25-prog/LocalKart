import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadStoreProfile, saveStoreProfile, STORE_PROFILE_EVENT, type StoreProfile } from './sellerProfile';

const PROFILE_KEY = 'localkart_store_profile';

const profile: StoreProfile = {
  name: 'Fresh Mart',
  handle: 'freshmart',
  description: 'Your neighbourhood store',
  logo: 'logo.png',
  banner: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  phone: '+91 98765 43210',
  address: 'Indiranagar, Bengaluru',
  pickupLocation: 'Front counter',
  businessCategory: 'Grocery',
  upiDetails: 'freshmart@upi',
  bankDetails: 'HDFC ****1234',
  openTime: '08:00 AM',
  closeTime: '10:00 PM',
  isOpen: true,
  tags: 'grocery,dairy',
};

describe('sellerProfile', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('loadStoreProfile', () => {
    it('returns null when no profile is stored', () => {
      expect(loadStoreProfile()).toBeNull();
    });

    it('returns the parsed profile when present', () => {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      expect(loadStoreProfile()).toEqual(profile);
    });

    it('returns null and logs when stored JSON is corrupt', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(PROFILE_KEY, '{oops');
      expect(loadStoreProfile()).toBeNull();
      expect(err).toHaveBeenCalled();
    });
  });

  describe('saveStoreProfile', () => {
    it('persists the profile and dispatches an event with the profile detail', () => {
      let detail: unknown;
      const listener = ((e: Event) => {
        detail = (e as CustomEvent).detail;
      }) as EventListener;
      window.addEventListener(STORE_PROFILE_EVENT, listener);

      saveStoreProfile(profile);

      expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!)).toEqual(profile);
      expect(detail).toEqual(profile);
      window.removeEventListener(STORE_PROFILE_EVENT, listener);
    });

    it('round-trips through loadStoreProfile', () => {
      saveStoreProfile(profile);
      expect(loadStoreProfile()).toEqual(profile);
    });
  });
});
