export interface StoreProfile {
  name: string;
  handle: string;
  description: string;
  logo: string; // base64 or URL
  banner: string; // image URL or CSS gradient string
  phone: string;
  address: string;
  pickupLocation: string;
  businessCategory: string;
  upiDetails: string;
  bankDetails: string;
  gstNumber?: string;
  socialLinks?: string;
  openTime: string; // e.g., "08:00 AM"
  closeTime: string; // e.g., "10:00 PM"
  isOpen: boolean;
  tags: string; // comma‑separated tag list
}

const PROFILE_KEY = 'localkart_store_profile';
export const STORE_PROFILE_EVENT = 'localkart_store_profile_updated';

/** Load the saved profile from localStorage. Returns null if none exists. */
export function loadStoreProfile(): StoreProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as StoreProfile) : null;
  } catch (e) {
    console.error('Failed to load store profile', e);
    return null;
  }
}

/** Save a profile object to localStorage and notify other components. */
export function saveStoreProfile(profile: StoreProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    // Dispatch a custom event so any UI listening for profile changes can react.
    const event = new CustomEvent(STORE_PROFILE_EVENT, { detail: profile });
    window.dispatchEvent(event);
  } catch (e) {
    console.error('Failed to save store profile', e);
  }
}
