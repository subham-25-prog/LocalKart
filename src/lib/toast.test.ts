import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toast } from './toast';

describe('toast', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends a toast element with the given message', () => {
    toast('Added to cart');
    const el = document.body.querySelector('div');
    expect(el).not.toBeNull();
    expect(el!.textContent).toBe('Added to cart');
    expect(el!.style.position).toBe('fixed');
  });

  it('removes the toast after 3 seconds', () => {
    toast('Bye');
    expect(document.body.querySelectorAll('div')).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(document.body.querySelectorAll('div')).toHaveLength(0);
  });

  it('can show multiple toasts at once', () => {
    toast('one');
    toast('two');
    expect(document.body.querySelectorAll('div')).toHaveLength(2);
  });
});
