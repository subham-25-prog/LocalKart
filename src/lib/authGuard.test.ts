import { describe, it, expect, beforeEach, vi } from 'vitest';

const { push, replace, toast, getStoredUser } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  toast: vi.fn(),
  getStoredUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));
vi.mock('@/lib/toast', () => ({ toast }));
vi.mock('@/lib/auth', () => ({ getStoredUser }));

import { useAuthCheckout } from './authGuard';

describe('useAuthCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to checkout when a user is signed in', () => {
    getStoredUser.mockReturnValue({ id: 'u1', role: 'buyer' });
    const { handleCheckout } = useAuthCheckout();
    handleCheckout();
    expect(push).toHaveBeenCalledWith('/checkout');
    expect(replace).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('redirects to login with a callback and toasts when not signed in', () => {
    getStoredUser.mockReturnValue(null);
    const { handleCheckout } = useAuthCheckout();
    handleCheckout();
    expect(toast).toHaveBeenCalledWith('Please log in to checkout');
    expect(replace).toHaveBeenCalledWith('/login?callbackUrl=/checkout');
    expect(push).not.toHaveBeenCalled();
  });
});
